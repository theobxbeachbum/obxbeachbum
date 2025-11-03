from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Header, Request, File, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import bcrypt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import secrets
import io
import csv
import httpx
import mimetypes
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class AdminLogin(BaseModel):
    password: str

class AdminResponse(BaseModel):
    success: bool
    token: Optional[str] = None

class SubscriberCreate(BaseModel):
    email: EmailStr

class Subscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, unsubscribed
    unsubscribe_token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

class PostCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    status: str = "draft"  # draft, published

class SendNewsletterRequest(BaseModel):
    post_id: str

class SettingsUpdate(BaseModel):
    sendgrid_api_key: Optional[str] = None
    sender_email: Optional[str] = None
    admin_password: Optional[str] = None
    stripe_enabled: Optional[bool] = None
    stripe_price_id: Optional[str] = None
    support_amount: Optional[float] = None
    bunny_storage_api_key: Optional[str] = None
    bunny_storage_zone: Optional[str] = None
    bunny_storage_region: Optional[str] = None
    bunny_pull_zone_url: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    sendgrid_api_key: Optional[str] = None
    sender_email: Optional[str] = None
    admin_password_hash: Optional[str] = None
    stripe_enabled: bool = False
    stripe_price_id: Optional[str] = None
    support_amount: Optional[float] = 5.0
    bunny_storage_api_key: Optional[str] = None
    bunny_storage_zone: Optional[str] = None
    bunny_storage_region: Optional[str] = "ny"
    bunny_pull_zone_url: Optional[str] = None

class SupporterSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    status: str = "active"
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupporterCheckoutRequest(BaseModel):
    email: EmailStr
    origin_url: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    email: str
    amount: float
    currency: str
    payment_status: str = "pending"
    metadata: Optional[Dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def get_settings() -> Settings:
    settings_doc = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings_doc:
        # Initialize default settings
        default_settings = Settings()
        default_settings.admin_password_hash = hash_password("admin123")
        doc = default_settings.model_dump()
        doc['admin_password_hash'] = default_settings.admin_password_hash
        await db.settings.insert_one(doc)
        return default_settings
    return Settings(**settings_doc)

async def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.replace("Bearer ", "")
    if token != "admin_session_token":
        raise HTTPException(401, "Invalid token")
    return True

def create_email_html(post: Post, unsubscribe_token: str, base_url: str) -> str:
    unsubscribe_link = f"{base_url}/unsubscribe?token={unsubscribe_token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Crimson Text', Georgia, serif;
                line-height: 1.8;
                color: #2c2c2c;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                text-align: center;
                padding: 40px 0 20px 0;
                border-bottom: 1px solid #e0e0e0;
            }}
            .title {{
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 32px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #1a1a1a;
            }}
            .date {{
                font-size: 14px;
                color: #666;
            }}
            .content {{
                padding: 40px 0;
                font-size: 18px;
            }}
            .image {{
                width: 100%;
                height: auto;
                margin: 30px 0;
            }}
            .footer {{
                border-top: 1px solid #e0e0e0;
                padding-top: 20px;
                margin-top: 40px;
                text-align: center;
                font-size: 14px;
                color: #666;
            }}
            .unsubscribe {{
                color: #999;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">{post.title}</h1>
            <p class="date">{post.published_at.strftime('%B %d, %Y') if post.published_at else ''}</p>
        </div>
        
        <div class="content">
            {f'<img src="{post.image_url}" class="image" alt="{post.title}" />' if post.image_url else ''}
            <p>{post.content.replace(chr(10), '<br>')}</p>
        </div>
        
        <div class="footer">
            <p>You're receiving this because you subscribed to our newsletter.</p>
            <p><a href="{unsubscribe_link}" class="unsubscribe">Unsubscribe</a></p>
        </div>
    </body>
    </html>
    """
    return html

async def send_email_to_subscriber(subscriber: Subscriber, post: Post, settings: Settings, base_url: str):
    if not settings.sendgrid_api_key or not settings.sender_email:
        raise Exception("SendGrid not configured")
    
    html_content = create_email_html(post, subscriber.unsubscribe_token, base_url)
    
    message = Mail(
        from_email=settings.sender_email,
        to_emails=subscriber.email,
        subject=post.title,
        html_content=html_content
    )
    
    sg = SendGridAPIClient(settings.sendgrid_api_key)
    response = sg.send(message)
    return response.status_code == 202

# Admin endpoints
@api_router.post("/admin/login", response_model=AdminResponse)
async def admin_login(login_data: AdminLogin):
    settings = await get_settings()
    if not settings.admin_password_hash:
        raise HTTPException(400, "Admin password not set")
    
    if verify_password(login_data.password, settings.admin_password_hash):
        return AdminResponse(success=True, token="admin_session_token")
    raise HTTPException(401, "Invalid password")

@api_router.get("/admin/verify")
async def verify_admin(authorization: Optional[str] = Header(None)):
    try:
        await verify_admin_token(authorization)
        return {"success": True}
    except:
        raise HTTPException(401, "Not authenticated")

# Settings endpoints
@api_router.get("/settings")
async def get_settings_endpoint(authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    settings = await get_settings()
    # Don't send password hash or API keys to frontend
    return {
        "sendgrid_configured": bool(settings.sendgrid_api_key),
        "sender_email": settings.sender_email,
        "stripe_enabled": settings.stripe_enabled,
        "stripe_price_id": settings.stripe_price_id,
        "support_amount": settings.support_amount,
        "bunny_configured": bool(settings.bunny_storage_api_key and settings.bunny_storage_zone),
        "bunny_storage_zone": settings.bunny_storage_zone,
        "bunny_storage_region": settings.bunny_storage_region,
        "bunny_pull_zone_url": settings.bunny_pull_zone_url
    }

@api_router.post("/settings")
async def update_settings(update: SettingsUpdate, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    settings = await get_settings()
    
    update_dict = {}
    if update.sendgrid_api_key:
        update_dict["sendgrid_api_key"] = update.sendgrid_api_key
    if update.sender_email:
        update_dict["sender_email"] = update.sender_email
    if update.admin_password:
        update_dict["admin_password_hash"] = hash_password(update.admin_password)
    if update.stripe_enabled is not None:
        update_dict["stripe_enabled"] = update.stripe_enabled
    if update.stripe_price_id:
        update_dict["stripe_price_id"] = update.stripe_price_id
    if update.support_amount is not None:
        update_dict["support_amount"] = update.support_amount
    if update.bunny_storage_api_key:
        update_dict["bunny_storage_api_key"] = update.bunny_storage_api_key
    if update.bunny_storage_zone:
        update_dict["bunny_storage_zone"] = update.bunny_storage_zone
    if update.bunny_storage_region:
        update_dict["bunny_storage_region"] = update.bunny_storage_region
    if update.bunny_pull_zone_url:
        update_dict["bunny_pull_zone_url"] = update.bunny_pull_zone_url
    
    await db.settings.update_one({"id": "settings"}, {"$set": update_dict})
    return {"success": True}

# Subscriber endpoints
@api_router.post("/subscribers")
async def add_subscriber(subscriber_data: SubscriberCreate):
    # Check if already subscribed
    existing = await db.subscribers.find_one({"email": subscriber_data.email}, {"_id": 0})
    if existing:
        if existing.get("status") == "unsubscribed":
            # Resubscribe
            await db.subscribers.update_one(
                {"email": subscriber_data.email},
                {"$set": {"status": "active", "subscribed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": "Resubscribed successfully"}
        return {"success": True, "message": "Already subscribed"}
    
    subscriber = Subscriber(email=subscriber_data.email)
    doc = subscriber.model_dump()
    doc['subscribed_at'] = doc['subscribed_at'].isoformat()
    await db.subscribers.insert_one(doc)
    return {"success": True, "message": "Subscribed successfully"}

@api_router.get("/subscribers", response_model=List[Subscriber])
async def list_subscribers(authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    subscribers = await db.subscribers.find({"status": "active"}, {"_id": 0}).to_list(10000)
    for sub in subscribers:
        if isinstance(sub['subscribed_at'], str):
            sub['subscribed_at'] = datetime.fromisoformat(sub['subscribed_at'])
    return subscribers

@api_router.delete("/subscribers/{email}")
async def remove_subscriber(email: str, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    await db.subscribers.update_one(
        {"email": email},
        {"$set": {"status": "unsubscribed"}}
    )
    return {"success": True}

@api_router.get("/subscribers/export")
async def export_subscribers(authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    subscribers = await db.subscribers.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Email", "Subscribed At"])
    for sub in subscribers:
        subscribed_at = sub['subscribed_at']
        if isinstance(subscribed_at, str):
            subscribed_at = datetime.fromisoformat(subscribed_at)
        writer.writerow([sub['email'], subscribed_at.strftime('%Y-%m-%d %H:%M:%S')])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=subscribers.csv"}
    )

@api_router.get("/unsubscribe")
async def unsubscribe(token: str):
    subscriber = await db.subscribers.find_one({"unsubscribe_token": token}, {"_id": 0})
    if not subscriber:
        raise HTTPException(404, "Invalid unsubscribe link")
    
    await db.subscribers.update_one(
        {"unsubscribe_token": token},
        {"$set": {"status": "unsubscribed"}}
    )
    return {"success": True, "message": "Unsubscribed successfully"}

# Post endpoints
@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    post = Post(**post_data.model_dump())
    doc = post.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.posts.insert_one(doc)
    return post

@api_router.get("/posts", response_model=List[Post])
async def list_posts(authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        if post.get('published_at') and isinstance(post['published_at'], str):
            post['published_at'] = datetime.fromisoformat(post['published_at'])
    return posts

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post not found")
    if isinstance(post['created_at'], str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    if post.get('published_at') and isinstance(post['published_at'], str):
        post['published_at'] = datetime.fromisoformat(post['published_at'])
    return Post(**post)

@api_router.put("/posts/{post_id}")
async def update_post(post_id: str, post_data: PostCreate, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    await db.posts.update_one(
        {"id": post_id},
        {"$set": post_data.model_dump()}
    )
    return {"success": True}

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    await db.posts.delete_one({"id": post_id})
    return {"success": True}

# Newsletter sending
@api_router.post("/newsletter/send")
async def send_newsletter(request: SendNewsletterRequest, http_request: Request, background_tasks: BackgroundTasks, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    
    # Get post
    post = await db.posts.find_one({"id": request.post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post not found")
    
    if isinstance(post['created_at'], str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    post_obj = Post(**post)
    
    # Get settings
    settings = await get_settings()
    if not settings.sendgrid_api_key or not settings.sender_email:
        raise HTTPException(400, "SendGrid not configured. Please add API key and sender email in settings.")
    
    # Get all active subscribers
    subscribers = await db.subscribers.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    if not subscribers:
        raise HTTPException(400, "No active subscribers")
    
    # Get base URL from request
    base_url = str(http_request.base_url).rstrip('/')
    
    # Send emails in background
    for sub_doc in subscribers:
        if isinstance(sub_doc['subscribed_at'], str):
            sub_doc['subscribed_at'] = datetime.fromisoformat(sub_doc['subscribed_at'])
        subscriber = Subscriber(**sub_doc)
        background_tasks.add_task(send_email_to_subscriber, subscriber, post_obj, settings, base_url)
    
    # Mark post as published
    await db.posts.update_one(
        {"id": request.post_id},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"Newsletter queued for {len(subscribers)} subscribers"}

# Supporter endpoints
@api_router.post("/supporters/checkout")
async def create_supporter_checkout(request: SupporterCheckoutRequest, http_request: Request):
    settings = await get_settings()
    if not settings.stripe_enabled:
        raise HTTPException(400, "Supporter subscriptions not enabled")
    
    # Get Stripe API key from environment
    stripe_api_key = os.getenv('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    # Initialize Stripe
    host_url = request.origin_url.rstrip('/')
    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{host_url}/supporter-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{host_url}/support"
    
    checkout_request = CheckoutSessionRequest(
        amount=settings.support_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "email": request.email,
            "type": "supporter_subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        session_id=session.session_id,
        email=request.email,
        amount=settings.support_amount,
        currency="usd",
        payment_status="pending",
        metadata={"email": request.email, "type": "supporter_subscription"}
    )
    doc = transaction.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.payment_transactions.insert_one(doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/supporters/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, http_request: Request):
    # Get transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    # If already processed, return cached status
    if transaction['payment_status'] == 'paid':
        return {"status": "complete", "payment_status": "paid"}
    
    # Get Stripe status
    stripe_api_key = os.getenv('STRIPE_API_KEY')
    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": checkout_status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If paid, create supporter record
    if checkout_status.payment_status == 'paid' and transaction['payment_status'] != 'paid':
        supporter = SupporterSubscription(
            email=transaction['email'],
            amount=transaction['amount'],
            status="active"
        )
        doc = supporter.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.supporters.insert_one(doc)
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status
    }

@api_router.get("/supporters", response_model=List[SupporterSubscription])
async def list_supporters(authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    supporters = await db.supporters.find({"status": "active"}, {"_id": 0}).to_list(1000)
    for supporter in supporters:
        if isinstance(supporter['created_at'], str):
            supporter['created_at'] = datetime.fromisoformat(supporter['created_at'])
    return supporters

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.getenv('STRIPE_API_KEY')
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {"$set": {
                "payment_status": webhook_response.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"success": True}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(400, "Webhook processing failed")

# Public embed form endpoint
@api_router.get("/embed/subscribe", response_class=HTMLResponse)
async def get_subscribe_embed(request: Request):
    base_url = str(request.base_url).rstrip('/')
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        .newsletter-subscribe {{
            font-family: 'Crimson Text', Georgia, serif;
            max-width: 400px;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background: #fff;
        }}
        .newsletter-subscribe h3 {{
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 24px;
            margin: 0 0 10px 0;
            color: #1a1a1a;
        }}
        .newsletter-subscribe p {{
            color: #666;
            margin: 0 0 20px 0;
            font-size: 16px;
        }}
        .newsletter-subscribe input {{
            width: 100%;
            padding: 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }}
        .newsletter-subscribe button {{
            width: 100%;
            padding: 12px;
            background: #1a1a1a;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }}
        .newsletter-subscribe button:hover {{
            background: #333;
        }}
        .newsletter-message {{
            margin-top: 10px;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
        }}
        .newsletter-message.success {{
            background: #d4edda;
            color: #155724;
        }}
        .newsletter-message.error {{
            background: #f8d7da;
            color: #721c24;
        }}
    </style>
</head>
<body>
    <div class="newsletter-subscribe">
        <h3>Subscribe to Newsletter</h3>
        <p>Get updates delivered to your inbox</p>
        <form id="subscribeForm">
            <input type="email" id="email" placeholder="Your email address" required />
            <button type="submit">Subscribe</button>
        </form>
        <div id="message"></div>
    </div>
    
    <script>
        document.getElementById('subscribeForm').addEventListener('submit', async (e) => {{
            e.preventDefault();
            const email = document.getElementById('email').value;
            const messageDiv = document.getElementById('message');
            
            try {{
                const response = await fetch('{base_url}/api/subscribers', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{email}})
                }});
                
                const data = await response.json();
                
                if (data.success) {{
                    messageDiv.className = 'newsletter-message success';
                    messageDiv.textContent = data.message;
                    document.getElementById('email').value = '';
                }} else {{
                    messageDiv.className = 'newsletter-message error';
                    messageDiv.textContent = 'Subscription failed';
                }}
            }} catch (error) {{
                messageDiv.className = 'newsletter-message error';
                messageDiv.textContent = 'An error occurred';
            }}
        }});
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()