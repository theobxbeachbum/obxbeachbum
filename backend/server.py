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
from datetime import datetime, timezone, timedelta
import bcrypt
import secrets
import io
import csv
import httpx
import mimetypes
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import markdown
import stripe
import jwt
import bleach
from collections import defaultdict
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

# ============================================
# SECURITY CONFIGURATION
# ============================================

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Rate Limiting Configuration
LOGIN_RATE_LIMIT = 5  # Max attempts
LOGIN_RATE_WINDOW = 300  # 5 minutes in seconds
login_attempts = defaultdict(list)  # IP -> list of timestamps

# HTML Sanitization - allowed tags and attributes
ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'img', 'figure', 'figcaption', 'hr', 'span', 'div'
]
ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'style']
}

def create_jwt_token(data: dict) -> str:
    """Create a JWT token with expiration."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify a JWT token and return payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired - please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def check_rate_limit(ip: str) -> bool:
    """Check if IP is rate limited. Returns True if allowed, raises exception if blocked."""
    now = datetime.now(timezone.utc).timestamp()
    # Clean old attempts
    login_attempts[ip] = [t for t in login_attempts[ip] if now - t < LOGIN_RATE_WINDOW]
    
    if len(login_attempts[ip]) >= LOGIN_RATE_LIMIT:
        wait_time = int(LOGIN_RATE_WINDOW - (now - login_attempts[ip][0]))
        raise HTTPException(429, f"Too many login attempts. Try again in {wait_time} seconds.")
    
    return True

def record_login_attempt(ip: str):
    """Record a failed login attempt."""
    login_attempts[ip].append(datetime.now(timezone.utc).timestamp())

def sanitize_html(content: str) -> str:
    """Sanitize HTML content to prevent XSS attacks."""
    if not content:
        return content
    return bleach.clean(content, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)

# Models
class AdminLogin(BaseModel):
    password: str

class AdminResponse(BaseModel):
    success: bool
    token: Optional[str] = None

class SubscriberCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class Subscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, unsubscribed
    unsubscribe_token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

class PostCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None  # Support multiple images
    slug: Optional[str] = None  # URL-friendly version of title
    status: Optional[str] = "draft"  # draft, published
    published_at: Optional[str] = None  # Allow custom date
    available_for_purchase: Optional[bool] = False  # Toggle for print sales

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None  # Support multiple images
    slug: Optional[str] = ""  # URL-friendly version of title
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    status: str = "draft"  # draft, published
    available_for_purchase: bool = False  # Toggle for print sales

# Print models for Gallery
class PrintCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    tags: Optional[List[str]] = []
    category: Optional[str] = None  # e.g., "Latest Posts", "Landscapes", etc.
    available_types: Optional[List[str]] = ["paper", "canvas", "metal"]
    featured: Optional[bool] = False
    active: Optional[bool] = True
    source_post_id: Optional[str] = None  # Links to originating post if auto-created

class Print(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: str
    tags: List[str] = []
    category: Optional[str] = None
    available_types: List[str] = ["paper", "canvas", "metal"]
    featured: bool = False
    active: bool = True
    sort_order: int = 0
    source_post_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PrintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    available_types: Optional[List[str]] = None
    featured: Optional[bool] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

# Print order models
class PrintOrderCreate(BaseModel):
    print_id: str
    print_title: str
    print_type: str  # paper, canvas, metal
    size: str
    price: float
    image_url: Optional[str] = None  # For direct post purchases
    special_instructions: Optional[str] = None
    origin_url: str
    source: str = "gallery"  # gallery or post

class PrintOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    print_id: str
    print_title: str
    print_type: str
    size: str
    price: float
    image_url: Optional[str] = None
    special_instructions: Optional[str] = None
    source: str = "gallery"
    stripe_session_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    shipping_address: Optional[Dict] = None
    payment_status: str = "pending"
    order_number: str = Field(default_factory=lambda: f"OBX-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Muggs (drinkware) product models
class MuggsProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    product_type: str  # mug, tumbler, sippy, coaster
    price: float  # Base price for non-variant products
    has_variants: bool = False  # True for coasters
    active: bool = True

class MuggsProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: str
    product_type: str
    price: float
    has_variants: bool = False
    active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Muggs (drinkware) order models
class MuggsOrderCreate(BaseModel):
    product_id: str
    product_title: str
    product_type: str  # mug, tumbler, sippy, coaster
    variant: Optional[str] = None  # For coasters: single, set-2, set-4
    variant_label: Optional[str] = None
    price: float
    special_instructions: Optional[str] = None
    origin_url: str

class MuggsOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_title: str
    product_type: str
    variant: Optional[str] = None
    variant_label: Optional[str] = None
    price: float
    special_instructions: Optional[str] = None
    stripe_session_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    shipping_address: Optional[Dict] = None
    payment_status: str = "pending"
    order_number: str = Field(default_factory=lambda: f"MUG-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Notecards product models
class NotecardsProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    active: bool = True

class NotecardsProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: str
    active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Notecards order models
class NotecardsOrderCreate(BaseModel):
    product_id: str
    product_title: str
    variant: str  # single, six-pak, ten-pak
    variant_label: str
    price: float
    special_instructions: Optional[str] = None
    origin_url: str

class NotecardsOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_title: str
    variant: str
    variant_label: str
    price: float
    special_instructions: Optional[str] = None
    stripe_session_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    shipping_address: Optional[Dict] = None
    payment_status: str = "pending"
    order_number: str = Field(default_factory=lambda: f"NOTE-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Tees product models
class TeesProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    product_type: str = "tshirt"  # tshirt, tank, hoodie, cap
    sizes: List[str] = ["S", "M", "L", "XL", "2XL"]
    price: float = 25.00
    active: bool = True

class TeesProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    image_url: str
    product_type: str = "tshirt"
    sizes: List[str] = ["S", "M", "L", "XL", "2XL"]
    price: float = 25.00
    active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Tees order models
class TeesOrderCreate(BaseModel):
    product_id: str
    product_title: str
    product_type: str
    size: str
    price: float
    special_instructions: Optional[str] = None
    origin_url: str

class TeesOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_title: str
    product_type: str
    size: str
    price: float
    special_instructions: Optional[str] = None
    stripe_session_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    shipping_address: Optional[Dict] = None
    payment_status: str = "pending"
    order_number: str = Field(default_factory=lambda: f"TEE-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SendNewsletterRequest(BaseModel):
    post_id: str
    audience: str = "all"  # all, paid, free

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
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

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
    smtp_host: Optional[str] = "mail.smtp2go.com"
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

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
    plan: Optional[str] = "monthly"  # monthly, annual

class DonationCheckoutRequest(BaseModel):
    email: EmailStr
    origin_url: str
    amount: float

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

def create_slug(title: str) -> str:
    """Create URL-friendly slug from title."""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    slug = slug.strip('-')
    return slug[:100]  # Limit length

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
    
    # Verify JWT token
    payload = verify_jwt_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(401, "Invalid token")
    return True

# Backward compatible verify_token for routes using Header
def verify_token(authorization: Optional[str] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.replace("Bearer ", "")
    payload = verify_jwt_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(401, "Invalid token")
    return True

def convert_markdown_to_html(content: str) -> str:
    """Convert Markdown content to HTML with image and text formatting support."""
    # Use markdown library with common extensions
    md = markdown.Markdown(extensions=['nl2br', 'fenced_code', 'tables'])
    html_content = md.convert(content)
    # Sanitize the output
    return sanitize_html(html_content)


def strip_markdown_for_plain_text(content: str) -> str:
    """Strip Markdown syntax to get plain text for email fallback."""
    import re
    # Remove image markdown: ![alt](url)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', content)
    # Remove links but keep text: [text](url) -> text
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # Remove bold/italic markers
    text = re.sub(r'\*\*?(.*?)\*\*?', r'\1', text)
    text = re.sub(r'__?(.*?)__?', r'\1', text)
    # Remove headers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Clean up extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def create_email_html(post: Post, unsubscribe_token: str, base_url: str) -> str:
    unsubscribe_link = f"{base_url}/unsubscribe?token={unsubscribe_token}"
    
    # Convert Markdown content to HTML
    html_content = convert_markdown_to_html(post.content)
    
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
            .content img {{
                width: 100%;
                height: auto;
                margin: 30px 0;
                border-radius: 4px;
            }}
            .content p {{
                margin: 0 0 15px 0;
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
            {html_content}
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
    if not settings.smtp_username or not settings.smtp_password or not settings.sender_email:
        raise Exception("SMTP2GO not configured")
    
    html_content = create_email_html(post, subscriber.unsubscribe_token, base_url)
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = post.title
    msg['From'] = settings.sender_email
    msg['To'] = subscriber.email
    
    # Create plain text version (strip markdown for email clients that don't support HTML)
    plain_content = strip_markdown_for_plain_text(post.content)
    text_content = plain_content[:500] + "..." if len(plain_content) > 500 else plain_content
    
    # Attach both versions
    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))
    
    # Send via SMTP2GO
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.sender_email, [subscriber.email], msg.as_string())
        return True
    except Exception as e:
        logging.error(f"Error sending email to {subscriber.email}: {str(e)}")
        return False

# Admin endpoints
@api_router.post("/admin/login", response_model=AdminResponse)
async def admin_login(login_data: AdminLogin, request: Request):
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    
    # Check rate limit
    check_rate_limit(client_ip)
    
    settings = await get_settings()
    if not settings.admin_password_hash:
        raise HTTPException(400, "Admin password not set")
    
    if verify_password(login_data.password, settings.admin_password_hash):
        # Clear failed attempts on successful login
        login_attempts.pop(client_ip, None)
        # Create JWT token
        token = create_jwt_token({"role": "admin", "ip": client_ip})
        return AdminResponse(success=True, token=token)
    
    # Record failed attempt
    record_login_attempt(client_ip)
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
        "smtp_configured": bool(settings.smtp_username and settings.smtp_password),
        "sender_email": settings.sender_email,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
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
    if update.smtp_host:
        update_dict["smtp_host"] = update.smtp_host
    if update.smtp_port:
        update_dict["smtp_port"] = update.smtp_port
    if update.smtp_username:
        update_dict["smtp_username"] = update.smtp_username
    if update.smtp_password:
        update_dict["smtp_password"] = update.smtp_password
    
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
    
    # Auto-generate slug if not provided
    slug = post_data.slug if post_data.slug else create_slug(post_data.title)
    
    # Ensure slug is unique
    existing = await db.posts.find_one({"slug": slug}, {"_id": 0})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    # Create post dict and add slug
    post_dict = post_data.model_dump()
    post_dict['slug'] = slug
    
    # Sanitize content to prevent XSS
    if post_dict.get('content'):
        post_dict['content'] = sanitize_html(post_dict['content'])
    if post_dict.get('title'):
        post_dict['title'] = bleach.clean(post_dict['title'], tags=[], strip=True)
    
    post = Post(**post_dict)
    doc = post.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.posts.insert_one(doc)
    
    # Note: Posts with available_for_purchase=true will automatically appear in gallery
    # No need to create separate print entries
    
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
    
    # Sanitize content to prevent XSS
    update_data = post_data.model_dump()
    if update_data.get('content'):
        update_data['content'] = sanitize_html(update_data['content'])
    if update_data.get('title'):
        update_data['title'] = bleach.clean(update_data['title'], tags=[], strip=True)
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    return {"success": True}

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, authorization: Optional[str] = Header(None)):
    await verify_admin_token(authorization)
    await db.posts.delete_one({"id": post_id})
    return {"success": True}

@api_router.post("/posts/{post_id}/remove-from-gallery")
async def remove_post_from_gallery(post_id: str, authorization: Optional[str] = Header(None)):
    """Remove a post from the gallery by setting available_for_purchase to false."""
    await verify_admin_token(authorization)
    result = await db.posts.update_one(
        {"id": post_id},
        {"$set": {"available_for_purchase": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Post not found")
    return {"success": True}

# Public post endpoints (no authentication required)
@api_router.get("/public/posts", response_model=List[Post])
async def get_public_posts():
    """Get all published posts for public viewing."""
    posts = await db.posts.find({"status": "published"}, {"_id": 0}).sort("published_at", -1).to_list(1000)
    for post in posts:
        if isinstance(post['created_at'], str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        if post.get('published_at') and isinstance(post['published_at'], str):
            post['published_at'] = datetime.fromisoformat(post['published_at'])
    return posts

@api_router.get("/public/posts/{slug}", response_model=Post)
async def get_public_post_by_slug(slug: str):
    """Get a single published post by slug for public viewing."""
    post = await db.posts.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post not found")
    if isinstance(post['created_at'], str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    if post.get('published_at') and isinstance(post['published_at'], str):
        post['published_at'] = datetime.fromisoformat(post['published_at'])
    
    # Convert Markdown content to HTML for public viewing
    post['content'] = convert_markdown_to_html(post['content'])
    
    return Post(**post)

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
    if not settings.smtp_username or not settings.smtp_password or not settings.sender_email:
        raise HTTPException(400, "SMTP2GO not configured. Please add SMTP credentials and sender email in settings.")
    
    # Get all active subscribers
    subscribers = await db.subscribers.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    if not subscribers:
        raise HTTPException(400, "No active subscribers")
    
    # Get supporters to determine plans
    supporters = await db.supporters.find({}, {"email": 1, "plan": 1, "_id": 0}).to_list(10000)
    supporter_plans = {s['email']: s.get('plan', 'supporter') for s in supporters}
    
    # Filter subscribers based on audience
    filtered_subscribers = []
    for sub in subscribers:
        email = sub['email']
        plan = supporter_plans.get(email, 'free')
        
        if request.audience == 'all':
            filtered_subscribers.append(sub)
        elif request.audience == 'paid' and plan in ['monthly', 'annual', 'supporter']:
            filtered_subscribers.append(sub)
        elif request.audience == 'free' and plan == 'free':
            filtered_subscribers.append(sub)
    
    if not filtered_subscribers:
        audience_label = {'all': 'any', 'paid': 'paid', 'free': 'free'}[request.audience]
        raise HTTPException(400, f"No {audience_label} subscribers found")
    
    # Get base URL from request
    base_url = str(http_request.base_url).rstrip('/')
    
    # Send emails in background
    for sub_doc in filtered_subscribers:
        if isinstance(sub_doc['subscribed_at'], str):
            sub_doc['subscribed_at'] = datetime.fromisoformat(sub_doc['subscribed_at'])
        subscriber = Subscriber(**sub_doc)
        background_tasks.add_task(send_email_to_subscriber, subscriber, post_obj, settings, base_url)
    
    # Mark post as published
    await db.posts.update_one(
        {"id": request.post_id},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    audience_label = {'all': 'all', 'paid': 'paid', 'free': 'free'}[request.audience]
    return {"success": True, "message": f"Newsletter queued for {len(filtered_subscribers)} {audience_label} subscribers"}

# Supporter endpoints
# Subscription plan pricing
SUBSCRIPTION_PLANS = {
    'monthly': {'amount': 7, 'name': 'Monthly Supporter', 'interval': 'month'},
    'annual': {'amount': 70, 'name': 'Annual Supporter', 'interval': 'year'}
}

@api_router.post("/supporters/checkout")
async def create_supporter_checkout(request: SupporterCheckoutRequest, http_request: Request):
    # Validate plan
    if request.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(400, "Invalid subscription plan")
    
    plan = SUBSCRIPTION_PLANS[request.plan]
    
    # Get Stripe API key from environment
    stripe_api_key = os.getenv('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    host_url = request.origin_url.rstrip('/')
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": plan['name'],
                        "description": f"Support the OBX Beach Bum - {plan['name']}"
                    },
                    "unit_amount": int(plan['amount'] * 100),
                    "recurring": {"interval": plan['interval']}
                },
                "quantity": 1
            }],
            mode="subscription",
            success_url=f"{host_url}/supporter-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{host_url}/support",
            customer_email=request.email,
            metadata={
                "email": request.email,
                "plan": request.plan,
                "type": "supporter_subscription"
            }
        )
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id=session.id,
            email=request.email,
            amount=plan['amount'],
            currency="usd",
            payment_status="pending",
            metadata={"email": request.email, "plan": request.plan, "type": "supporter_subscription"}
        )
        doc = transaction.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.payment_transactions.insert_one(doc)
        
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        logging.error(f"Supporter checkout error: {str(e)}")
        raise HTTPException(500, f"Payment error: {str(e)}")


@api_router.post("/supporters/donate")
async def create_donation_checkout(request: DonationCheckoutRequest, http_request: Request):
    """Create a one-time donation checkout."""
    if request.amount < 1:
        raise HTTPException(400, "Minimum donation is $1")
    
    # Get Stripe API key from environment
    stripe_api_key = os.getenv('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    host_url = request.origin_url.rstrip('/')
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "One-Time Donation",
                        "description": "Support the OBX Beach Bum with a one-time donation"
                    },
                    "unit_amount": int(request.amount * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{host_url}/supporter-success?session_id={{CHECKOUT_SESSION_ID}}&type=donation",
            cancel_url=f"{host_url}/support",
            customer_email=request.email,
            metadata={
                "email": request.email,
                "amount": str(request.amount),
                "type": "donation"
            }
        )
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id=session.id,
            email=request.email,
            amount=request.amount,
            currency="usd",
            payment_status="pending",
            metadata={"email": request.email, "type": "donation"}
        )
        doc = transaction.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.payment_transactions.insert_one(doc)
        
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        logging.error(f"Donation checkout error: {str(e)}")
        raise HTTPException(500, f"Payment error: {str(e)}")

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

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """Upload image to Bunny.net CDN storage."""
    await verify_admin_token(authorization)
    
    # Get settings
    settings = await get_settings()
    if not settings.bunny_storage_api_key or not settings.bunny_storage_zone:
        raise HTTPException(400, "Bunny.net CDN not configured. Please add credentials in Settings.")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(415, "File must be an image")
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "File too large. Maximum size: 10MB")
    
    try:
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        # Determine storage endpoint based on region
        endpoints = {
            "de": "storage.bunnycdn.com",
            "uk": "uk.storage.bunnycdn.com",
            "ny": "ny.storage.bunnycdn.com",
            "la": "la.storage.bunnycdn.com",
            "sg": "sg.storage.bunnycdn.com"
        }
        
        region = settings.bunny_storage_region or "ny"
        endpoint = endpoints.get(region, "ny.storage.bunnycdn.com")
        
        # Upload to Bunny.net
        upload_url = f"https://{endpoint}/{settings.bunny_storage_zone}/newsletter-images/{unique_filename}"
        
        headers = {
            "AccessKey": settings.bunny_storage_api_key,
            "Content-Type": file.content_type
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                upload_url,
                content=content,
                headers=headers,
                timeout=30.0
            )
        
        if response.status_code not in (200, 201):
            raise HTTPException(500, f"Upload failed: {response.status_code}")
        
        # Construct CDN URL
        pull_zone_url = settings.bunny_pull_zone_url or f"https://{settings.bunny_storage_zone}.b-cdn.net"
        cdn_url = f"{pull_zone_url}/newsletter-images/{unique_filename}"
        
        return {
            "success": True,
            "cdn_url": cdn_url,
            "filename": unique_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Image upload error: {str(e)}")
        raise HTTPException(500, "Upload failed. Please try again.")

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

# ============================================
# PRINT GALLERY ENDPOINTS
# ============================================

# Pricing tables
PRINT_PRICING = {
    "paper": {
        "5x7": 25,
        "8x12": 35,
        "12x18": 58,
        "16x24": 93,
        "20x30": 137,
        "24x36": 175
    },
    "canvas": {
        "8x12": 87,
        "12x18": 120,
        "16x24": 170,
        "20x30": 205,
        "24x36": 300,
        "32x48": 500,
        "40x60": 749
    },
    "metal": {
        "4x6": 37,
        "5x7": 47,
        "8x12": 77,
        "12x18": 157,
        "16x24": 350,
        "20x30": 460,
        "24x36": 532,
        "32x48": 979,
        "40x60": 1463
    }
}

PRINT_TYPE_NAMES = {
    "paper": "Fine Art Paper Print",
    "canvas": "Canvas Wall Art",
    "metal": "Metal Print"
}

# Get pricing data (public)
@api_router.get("/prints/pricing")
async def get_print_pricing():
    """Get print pricing tables."""
    return {
        "pricing": PRINT_PRICING,
        "type_names": PRINT_TYPE_NAMES
    }

# Admin: Get all prints
@api_router.get("/prints", response_model=List[Print])
async def get_prints(authorization: str = Header(None)):
    await verify_admin_token(authorization)
    prints = await db.prints.find({}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return [Print(**p) for p in prints]

# Admin: Create print
@api_router.post("/prints", response_model=Print)
async def create_print(print_data: PrintCreate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    
    # Get max sort_order
    max_order = await db.prints.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 1
    
    new_print = Print(
        **print_data.model_dump(),
        sort_order=next_order
    )
    await db.prints.insert_one(new_print.model_dump())
    return new_print

# Admin: Update print
@api_router.put("/prints/{print_id}", response_model=Print)
async def update_print(print_id: str, print_data: PrintUpdate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    
    update_data = {k: v for k, v in print_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No data to update")
    
    result = await db.prints.update_one({"id": print_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Print not found")
    
    updated = await db.prints.find_one({"id": print_id}, {"_id": 0})
    return Print(**updated)

# Admin: Delete print
@api_router.delete("/prints/{print_id}")
async def delete_print(print_id: str, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    result = await db.prints.delete_one({"id": print_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Print not found")
    return {"success": True}


# ============================================
# MUGGS PRODUCTS - Admin CRUD
# ============================================

# Admin: Get all muggs products
@api_router.get("/admin/muggs-products")
async def get_admin_muggs_products(authorization: str = Header(None)):
    await verify_admin_token(authorization)
    products = await db.muggs_products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products

# Admin: Create muggs product
@api_router.post("/admin/muggs-products")
async def create_muggs_product(product: MuggsProductCreate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    new_product = MuggsProduct(**product.model_dump())
    await db.muggs_products.insert_one(new_product.model_dump())
    return {"success": True, "id": new_product.id}

# Admin: Update muggs product
@api_router.put("/admin/muggs-products/{product_id}")
async def update_muggs_product(product_id: str, product: MuggsProductCreate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    result = await db.muggs_products.update_one(
        {"id": product_id},
        {"$set": product.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return {"success": True}

# Admin: Delete muggs product
@api_router.delete("/admin/muggs-products/{product_id}")
async def delete_muggs_product(product_id: str, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    result = await db.muggs_products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"success": True}

# Admin: Reorder muggs products
@api_router.post("/admin/muggs-products/reorder")
async def reorder_muggs_products(order: List[str], authorization: str = Header(None)):
    await verify_admin_token(authorization)
    for i, product_id in enumerate(order):
        await db.muggs_products.update_one({"id": product_id}, {"$set": {"sort_order": i}})
    return {"success": True}

# Public: Get active muggs products
@api_router.get("/muggs-products")
async def get_muggs_products():
    products = await db.muggs_products.find({"active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products


# ============================================
# NOTECARDS PRODUCTS - Admin CRUD
# ============================================

# Admin: Get all notecards products
@api_router.get("/admin/notecards-products")
async def get_admin_notecards_products(authorization: str = Header(None)):
    await verify_admin_token(authorization)
    products = await db.notecards_products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products

# Admin: Create notecards product
@api_router.post("/admin/notecards-products")
async def create_notecards_product(product: NotecardsProductCreate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    new_product = NotecardsProduct(**product.model_dump())
    await db.notecards_products.insert_one(new_product.model_dump())
    return {"success": True, "id": new_product.id}

# Admin: Update notecards product
@api_router.put("/admin/notecards-products/{product_id}")
async def update_notecards_product(product_id: str, product: NotecardsProductCreate, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    result = await db.notecards_products.update_one(
        {"id": product_id},
        {"$set": product.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return {"success": True}

# Admin: Delete notecards product
@api_router.delete("/admin/notecards-products/{product_id}")
async def delete_notecards_product(product_id: str, authorization: str = Header(None)):
    await verify_admin_token(authorization)
    result = await db.notecards_products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"success": True}

# Admin: Reorder notecards products
@api_router.post("/admin/notecards-products/reorder")
async def reorder_notecards_products(order: List[str], authorization: str = Header(None)):
    await verify_admin_token(authorization)
    for i, product_id in enumerate(order):
        await db.notecards_products.update_one({"id": product_id}, {"$set": {"sort_order": i}})
    return {"success": True}

# Public: Get active notecards products
@api_router.get("/notecards-products")
async def get_notecards_products():
    products = await db.notecards_products.find({"active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products


# ============================================
# Tees Products API Endpoints
# ============================================

# Admin: Get all tees products
@api_router.get("/admin/tees-products")
async def get_admin_tees_products(authorization: str = Header(None)):
    verify_token(authorization)
    products = await db.tees_products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products

# Admin: Create tees product
@api_router.post("/admin/tees-products")
async def create_tees_product(product: TeesProductCreate, authorization: str = Header(None)):
    verify_token(authorization)
    new_product = TeesProduct(**product.model_dump())
    await db.tees_products.insert_one(new_product.model_dump())
    return {"success": True, "id": new_product.id}

# Admin: Update tees product
@api_router.put("/admin/tees-products/{product_id}")
async def update_tees_product(product_id: str, product: TeesProductCreate, authorization: str = Header(None)):
    verify_token(authorization)
    result = await db.tees_products.update_one(
        {"id": product_id},
        {"$set": product.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}

# Admin: Delete tees product
@api_router.delete("/admin/tees-products/{product_id}")
async def delete_tees_product(product_id: str, authorization: str = Header(None)):
    verify_token(authorization)
    result = await db.tees_products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}

# Admin: Reorder tees products
@api_router.post("/admin/tees-products/reorder")
async def reorder_tees_products(order: List[str], authorization: str = Header(None)):
    verify_token(authorization)
    for i, product_id in enumerate(order):
        await db.tees_products.update_one({"id": product_id}, {"$set": {"sort_order": i}})
    return {"success": True}

# Public: Get active tees products
@api_router.get("/tees")
async def get_tees_products():
    products = await db.tees_products.find({"active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return products


# Public: Get gallery (curated prints + purchasable posts)
@api_router.get("/public/gallery")
async def get_public_gallery(tag: Optional[str] = None, category: Optional[str] = None):
    """Get all prints for the public gallery."""
    # Get active curated prints
    query = {"active": True}
    if tag:
        query["tags"] = {"$regex": tag, "$options": "i"}
    if category:
        query["category"] = category
    
    prints = await db.prints.find(query, {"_id": 0}).to_list(1000)
    
    # Filter "Latest Posts" category to only show last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    filtered_prints = []
    for p in prints:
        if p.get("category") == "Latest Posts":
            created = p.get("created_at")
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace('Z', '+00:00'))
            if created and created >= thirty_days_ago:
                filtered_prints.append(p)
        else:
            filtered_prints.append(p)
    
    # Get purchasable posts (published + available_for_purchase)
    post_query = {"status": "published", "available_for_purchase": True}
    if tag:
        post_query["title"] = {"$regex": tag, "$options": "i"}
    
    purchasable_posts = await db.posts.find(post_query, {"_id": 0}).to_list(1000)
    
    # Convert posts to print-like format
    post_prints = []
    for post in purchasable_posts:
        if post.get("image_url"):
            post_prints.append({
                "id": post["id"],
                "title": post["title"],
                "description": None,
                "image_url": post["image_url"],
                "tags": [],
                "category": None,
                "available_types": ["paper", "canvas", "metal"],
                "featured": False,
                "active": True,
                "sort_order": 999,
                "source": "post"
            })
    
    # Sort: featured first, then by sort_order
    all_prints = filtered_prints + post_prints
    all_prints.sort(key=lambda x: (not x.get("featured", False), x.get("sort_order", 999)))
    
    return all_prints

# Public: Get all tags and categories
@api_router.get("/public/gallery/tags")
async def get_gallery_tags():
    """Get all unique tags from prints."""
    prints = await db.prints.find({"active": True}, {"tags": 1, "_id": 0}).to_list(1000)
    all_tags = set()
    for p in prints:
        all_tags.update(p.get("tags", []))
    return sorted(list(all_tags))

@api_router.get("/public/gallery/categories")
async def get_gallery_categories():
    """Get all unique categories from prints."""
    prints = await db.prints.find({"active": True}, {"category": 1, "_id": 0}).to_list(1000)
    categories = set()
    for p in prints:
        if p.get("category"):
            categories.add(p["category"])
    return sorted(list(categories))

# Print checkout
@api_router.post("/prints/checkout")
async def create_print_checkout(order: PrintOrderCreate, authorization: str = Header(None)):
    """Create Stripe checkout for print purchase."""
    settings = await get_settings()
    
    # Validate price
    if order.print_type not in PRINT_PRICING:
        raise HTTPException(400, "Invalid print type")
    if order.size not in PRINT_PRICING[order.print_type]:
        raise HTTPException(400, "Invalid size for print type")
    
    expected_price = PRINT_PRICING[order.print_type][order.size]
    if abs(order.price - expected_price) > 0.01:
        raise HTTPException(400, "Price mismatch")
    
    # Create order record
    print_order = PrintOrder(
        print_id=order.print_id,
        print_title=order.print_title,
        print_type=order.print_type,
        size=order.size,
        price=order.price,
        image_url=order.image_url,
        special_instructions=order.special_instructions,
        source=order.source
    )
    await db.print_orders.insert_one(print_order.model_dump())
    
    # Create Stripe checkout using Stripe SDK directly (for custom line items with shipping)
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    # Use Emergent proxy if using test key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    type_name = PRINT_TYPE_NAMES.get(order.print_type, order.print_type)
    product_name = f"{order.print_title} - {type_name} ({order.size})"
    
    # Determine cancel URL based on source
    cancel_url = f"{order.origin_url}/gallery"
    if order.source == "post":
        cancel_url = order.origin_url  # Go back to the post they were viewing
    
    # Build product data with image if available
    product_data = {
        "name": product_name,
        "description": "Fine art print by the OBX Beach Bum"
    }
    if order.image_url:
        product_data["images"] = [order.image_url]
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": product_data,
                    "unit_amount": int(order.price * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{order.origin_url}/order-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            shipping_address_collection={"allowed_countries": ["US"]},
            metadata={
                "order_id": print_order.id,
                "print_title": order.print_title,
                "print_type": order.print_type,
                "size": order.size,
                "source": order.source,
                "special_instructions": order.special_instructions or ""
            }
        )
        
        # Update order with session ID
        await db.print_orders.update_one(
            {"id": print_order.id},
            {"$set": {"stripe_session_id": session.id}}
        )
        
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Stripe checkout error: {error_msg}")
        raise HTTPException(500, f"Payment error: {error_msg}")

# Print checkout status & order completion
@api_router.get("/prints/checkout/status/{session_id}")
async def get_print_checkout_status(session_id: str, background_tasks: BackgroundTasks):
    """Check print order payment status and return order details."""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Get order from database
    order = await db.print_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    
    # Get type display name
    type_name = PRINT_TYPE_NAMES.get(order.get("print_type"), order.get("print_type"))
    
    # If order is already marked as paid, return the stored data
    if order.get("payment_status") == "paid":
        return {
            "payment_status": "paid",
            "order_number": order.get("order_number"),
            "print_title": order.get("print_title"),
            "print_type": type_name,
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    
    try:
        # Get session details from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        
        if payment_status == "paid":
            # Update order with customer details
            customer_email = session.customer_details.email if session.customer_details else None
            customer_name = session.customer_details.name if session.customer_details else None
            shipping = None
            if session.shipping_details:
                shipping = {
                    "name": session.shipping_details.name,
                    "address": {
                        "line1": session.shipping_details.address.line1,
                        "line2": session.shipping_details.address.line2,
                        "city": session.shipping_details.address.city,
                        "state": session.shipping_details.address.state,
                        "postal_code": session.shipping_details.address.postal_code,
                        "country": session.shipping_details.address.country
                    }
                }
            
            await db.print_orders.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "customer_email": customer_email,
                    "customer_name": customer_name,
                    "shipping_address": shipping
                }}
            )
            
            # Refresh order data
            order = await db.print_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
            
            # Send order notification email
            background_tasks.add_task(send_print_order_notification, session_id)
        
        return {
            "payment_status": payment_status,
            "order_number": order.get("order_number"),
            "print_title": order.get("print_title"),
            "print_type": type_name,
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    except Exception as e:
        logging.error(f"Error getting checkout status: {str(e)}")
        # If Stripe lookup fails but order exists, return what we have
        return {
            "payment_status": order.get("payment_status", "unknown"),
            "order_number": order.get("order_number"),
            "print_title": order.get("print_title"),
            "print_type": type_name,
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }

async def send_print_order_notification(session_id: str):
    """Send order notification email to Roy."""
    settings = await get_settings()
    order = await db.print_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if not order:
        return
    
    # Get Stripe session for shipping address
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_api_key)
    
    try:
        import stripe
        stripe.api_key = stripe_api_key
        session = stripe.checkout.Session.retrieve(session_id, expand=['shipping_details', 'customer_details'])
        
        shipping = session.shipping_details or {}
        shipping_address = shipping.get('address', {})
        customer_details = session.customer_details or {}
    except:
        shipping_address = {}
        customer_details = {}
    
    type_name = PRINT_TYPE_NAMES.get(order['print_type'], order['print_type'])
    
    # Build email
    subject = f"🖼️ New Print Order: {order['order_number']}"
    
    html_content = f"""
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">New Print Order!</h1>
        
        <h2 style="color: #333;">Order #{order['order_number']}</h2>
        <p><strong>Date:</strong> {order['created_at'][:10] if isinstance(order['created_at'], str) else order['created_at'].strftime('%Y-%m-%d')}</p>
        
        <h3 style="color: #333; margin-top: 30px;">Customer Information</h3>
        <p><strong>Name:</strong> {customer_details.get('name', order.get('customer_name', 'N/A'))}</p>
        <p><strong>Email:</strong> {order.get('customer_email', 'N/A')}</p>
        
        <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
        <p>
            {shipping_address.get('line1', '')}<br>
            {shipping_address.get('line2', '') + '<br>' if shipping_address.get('line2') else ''}
            {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('postal_code', '')}<br>
            {shipping_address.get('country', '')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Photo Title</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['print_title']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Print Type</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{type_name}</td>
            </tr>
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Size</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['size']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Price</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${order['price']:.2f}</td>
            </tr>
        </table>
        
        {"<h3 style='color: #333; margin-top: 30px;'>Special Instructions</h3><p style='background: #fff9e6; padding: 15px; border-left: 4px solid #f0ad4e;'>" + order['special_instructions'] + "</p>" if order.get('special_instructions') else ""}
        
        <p style="margin-top: 30px; padding: 15px; background: #d4edda; border-radius: 4px;">
            <strong>Stripe Payment ID:</strong> {session_id}
        </p>
    </div>
    """
    
    # Send to Roy
    roy_email = "roye@theobxbeachbum.com"
    
    if settings.smtp_host and settings.smtp_username:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.sender_email or settings.smtp_username
            msg['To'] = roy_email
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(msg['From'], [roy_email], msg.as_string())
            
            logging.info(f"Order notification sent for {order['order_number']}")
        except Exception as e:
            logging.error(f"Failed to send order notification: {e}")

# Send customer confirmation email
async def send_customer_order_confirmation(session_id: str):
    """Send order confirmation to customer."""
    settings = await get_settings()
    order = await db.print_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if not order or not order.get('customer_email'):
        return
    
    # Get shipping details from Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    try:
        import stripe
        stripe.api_key = stripe_api_key
        session = stripe.checkout.Session.retrieve(session_id, expand=['shipping_details', 'customer_details'])
        shipping = session.shipping_details or {}
        shipping_address = shipping.get('address', {})
        customer_details = session.customer_details or {}
        customer_name = customer_details.get('name', '').split()[0] if customer_details.get('name') else 'Valued Customer'
    except:
        shipping_address = {}
        customer_name = 'Valued Customer'
    
    type_name = PRINT_TYPE_NAMES.get(order['print_type'], order['print_type'])
    order_date = order['created_at'][:10] if isinstance(order['created_at'], str) else order['created_at'].strftime('%B %d, %Y')
    
    subject = f"Your Order Confirmation - {order['order_number']}"
    
    html_content = f"""
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <img src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg" alt="the OBX Beach Bum" style="height: 60px; margin-bottom: 20px;">
        
        <p>Hello {customer_name},</p>
        
        <p>Thank you for your purchase at the OBX Beach Bum!</p>
        
        <h2 style="color: #1a1a1a;">Your Order # {order['order_number']}</h2>
        <p><strong>Date:</strong> {order_date}</p>
        <p><strong>Email:</strong> {order['customer_email']}</p>
        
        <h3 style="color: #333; margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;">{order['print_title']}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{type_name} - {order['size']}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${order['price']:.2f}</td>
            </tr>
        </table>
        
        <h3 style="color: #333;">Shipping Address</h3>
        <p>
            {shipping_address.get('line1', '')}<br>
            {shipping_address.get('line2', '') + '<br>' if shipping_address.get('line2') else ''}
            {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('postal_code', '')}
        </p>
        
        <p style="margin-top: 30px; padding: 15px; background: #f0f7ff; border-radius: 4px;">
            Your print will be carefully prepared and shipped within 5-7 business days. You'll receive a shipping confirmation email with tracking information once your order is on its way.
        </p>
        
        <p style="margin-top: 30px;">Thank you for your business!</p>
        
        <p><strong>the OBX Beach Bum</strong><br>
        <a href="https://theobxbeachbum.com">theobxbeachbum.com</a></p>
    </div>
    """
    
    if settings.smtp_host and settings.smtp_username:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.sender_email or settings.smtp_username
            msg['To'] = order['customer_email']
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(msg['From'], [order['customer_email']], msg.as_string())
            
            logging.info(f"Customer confirmation sent for {order['order_number']}")
        except Exception as e:
            logging.error(f"Failed to send customer confirmation: {e}")


# ============================================
# MUGGS (Drinkware) Checkout Endpoints
# ============================================

# Muggs pricing validation
# Muggs pricing by product type (base prices)
MUGGS_TYPE_PRICING = {
    'mug': 18,
    'tumbler': 28,
    'sippy': 20,
    'coaster': {
        'single': 7,
        'set-2': 12,
        'set-4': 21
    }
}

@api_router.post("/muggs/checkout")
async def create_muggs_checkout(order: MuggsOrderCreate):
    """Create Stripe checkout for muggs purchase."""
    
    # Get product from database to validate
    product = await db.muggs_products.find_one({"id": order.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(400, "Invalid product")
    
    # Validate price based on product type
    if product.get('has_variants') or product.get('product_type') == 'coaster':
        # Coaster with variants
        if order.product_type not in MUGGS_TYPE_PRICING:
            raise HTTPException(400, "Invalid product type")
        pricing = MUGGS_TYPE_PRICING[order.product_type]
        if isinstance(pricing, dict):
            if not order.variant or order.variant not in pricing:
                raise HTTPException(400, "Invalid variant selection")
            expected_price = pricing[order.variant]
        else:
            expected_price = pricing
    else:
        # Regular product - use price from database
        expected_price = product.get('price', 0)
    
    if abs(order.price - expected_price) > 0.01:
        raise HTTPException(400, f"Price mismatch: expected {expected_price}, got {order.price}")
    
    # Create order record
    muggs_order = MuggsOrder(
        product_id=order.product_id,
        product_title=order.product_title,
        product_type=order.product_type,
        variant=order.variant,
        variant_label=order.variant_label,
        price=order.price,
        special_instructions=order.special_instructions
    )
    await db.muggs_orders.insert_one(muggs_order.model_dump())
    
    # Create Stripe checkout
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Build product name
    product_name = order.product_title
    if order.variant_label:
        product_name = f"{order.product_title} ({order.variant_label})"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product_name,
                        "description": "B.B. Muggs - Beach Bum Drinkware"
                    },
                    "unit_amount": int(order.price * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{order.origin_url}/muggs-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{order.origin_url}/shop/muggs",
            shipping_address_collection={"allowed_countries": ["US"]},
            metadata={
                "order_id": muggs_order.id,
                "product_title": order.product_title,
                "product_type": order.product_type,
                "variant": order.variant or "",
                "variant_label": order.variant_label or "",
                "special_instructions": order.special_instructions or ""
            }
        )
        
        # Update order with session ID
        await db.muggs_orders.update_one(
            {"id": muggs_order.id},
            {"$set": {"stripe_session_id": session.id}}
        )
        
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Muggs checkout error: {error_msg}")
        raise HTTPException(500, f"Payment error: {error_msg}")


@api_router.get("/muggs/checkout/status/{session_id}")
async def get_muggs_checkout_status(session_id: str, background_tasks: BackgroundTasks):
    """Check muggs order payment status and return order details."""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Get order from database
    order = await db.muggs_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    
    # If order is already marked as paid, return the stored data
    if order.get("payment_status") == "paid":
        return {
            "payment_status": "paid",
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    
    try:
        # Get session details from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        
        if payment_status == "paid":
            # Update order with customer details
            customer_email = session.customer_details.email if session.customer_details else None
            customer_name = session.customer_details.name if session.customer_details else None
            shipping = None
            if session.shipping_details:
                shipping = {
                    "name": session.shipping_details.name,
                    "address": {
                        "line1": session.shipping_details.address.line1,
                        "line2": session.shipping_details.address.line2,
                        "city": session.shipping_details.address.city,
                        "state": session.shipping_details.address.state,
                        "postal_code": session.shipping_details.address.postal_code,
                        "country": session.shipping_details.address.country
                    }
                }
            
            await db.muggs_orders.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "customer_email": customer_email,
                    "customer_name": customer_name,
                    "shipping_address": shipping
                }}
            )
            
            # Refresh order data
            order = await db.muggs_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
            
            # Send order notification email
            background_tasks.add_task(send_muggs_order_notification, session_id)
        
        return {
            "payment_status": payment_status,
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    except Exception as e:
        logging.error(f"Error getting muggs checkout status: {str(e)}")
        return {
            "payment_status": order.get("payment_status", "unknown"),
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }


async def send_muggs_order_notification(session_id: str):
    """Send muggs order notification email to Roy."""
    settings = await get_settings()
    order = await db.muggs_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if not order:
        return
    
    shipping = order.get('shipping_address', {})
    shipping_address = shipping.get('address', {}) if shipping else {}
    shipping_name = shipping.get('name', 'N/A') if shipping else 'N/A'
    
    variant_info = f" ({order['variant_label']})" if order.get('variant_label') else ""
    
    subject = f"🛒 New B.B. Muggs Order: {order['order_number']}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
            ☕ New B.B. Muggs Order!
        </h1>
        
        <p style="background: #e8f4ff; padding: 15px; border-radius: 4px;">
            <strong>Order Number:</strong> {order['order_number']}<br>
            <strong>Customer:</strong> {order.get('customer_name', 'N/A')}<br>
            <strong>Email:</strong> {order.get('customer_email', 'N/A')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
            {shipping_name}<br>
            {shipping_address.get('line1', 'N/A')}<br>
            {shipping_address.get('line2', '') + '<br>' if shipping_address.get('line2') else ''}
            {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('postal_code', '')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Product</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['product_title']}{variant_info}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Product Type</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['product_type'].title()}</td>
            </tr>
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Price</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${order['price']:.2f}</td>
            </tr>
        </table>
        
        {"<h3 style='color: #333; margin-top: 30px;'>Special Instructions</h3><p style='background: #fff9e6; padding: 15px; border-left: 4px solid #f0ad4e;'>" + order['special_instructions'] + "</p>" if order.get('special_instructions') else ""}
        
        <p style="margin-top: 30px; padding: 15px; background: #d4edda; border-radius: 4px;">
            <strong>Stripe Payment ID:</strong> {session_id}
        </p>
    </div>
    """
    
    # Send to Roy
    roy_email = "roye@theobxbeachbum.com"
    
    if settings.smtp_host and settings.smtp_username:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.sender_email or settings.smtp_username
            msg['To'] = roy_email
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(msg['From'], [roy_email], msg.as_string())
            
            logging.info(f"Muggs order notification sent for {order['order_number']}")
        except Exception as e:
            logging.error(f"Failed to send muggs order notification: {e}")


# ============================================
# NOTECARDS Checkout Endpoints
# ============================================

# Notecards pricing
NOTECARDS_PRICING = {
    'single': 6,
    'six-pak': 30,
    'ten-pak': 40
}

@api_router.post("/notecards/checkout")
async def create_notecards_checkout(order: NotecardsOrderCreate):
    """Create Stripe checkout for notecards purchase."""
    
    # Validate variant and price
    if order.variant not in NOTECARDS_PRICING:
        raise HTTPException(400, "Invalid quantity selection")
    
    expected_price = NOTECARDS_PRICING[order.variant]
    if abs(order.price - expected_price) > 0.01:
        raise HTTPException(400, "Price mismatch")
    
    # Create order record
    notecards_order = NotecardsOrder(
        product_id=order.product_id,
        product_title=order.product_title,
        variant=order.variant,
        variant_label=order.variant_label,
        price=order.price,
        special_instructions=order.special_instructions
    )
    await db.notecards_orders.insert_one(notecards_order.model_dump())
    
    # Create Stripe checkout
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Build product name
    product_name = f"{order.product_title} ({order.variant_label})"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product_name,
                        "description": "Mostly Good Notecards - 5x7, blank inside, with envelope"
                    },
                    "unit_amount": int(order.price * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{order.origin_url}/notecards-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{order.origin_url}/shop/notecards",
            shipping_address_collection={"allowed_countries": ["US"]},
            metadata={
                "order_id": notecards_order.id,
                "product_title": order.product_title,
                "variant": order.variant,
                "variant_label": order.variant_label,
                "special_instructions": order.special_instructions or ""
            }
        )
        
        # Update order with session ID
        await db.notecards_orders.update_one(
            {"id": notecards_order.id},
            {"$set": {"stripe_session_id": session.id}}
        )
        
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Notecards checkout error: {error_msg}")
        raise HTTPException(500, f"Payment error: {error_msg}")


@api_router.get("/notecards/checkout/status/{session_id}")
async def get_notecards_checkout_status(session_id: str, background_tasks: BackgroundTasks):
    """Check notecards order payment status and return order details."""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Get order from database
    order = await db.notecards_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    
    # If order is already marked as paid, return the stored data
    if order.get("payment_status") == "paid":
        return {
            "payment_status": "paid",
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "variant": order.get("variant"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    
    try:
        # Get session details from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        
        if payment_status == "paid":
            # Update order with customer details
            customer_email = session.customer_details.email if session.customer_details else None
            customer_name = session.customer_details.name if session.customer_details else None
            shipping = None
            if session.shipping_details:
                shipping = {
                    "name": session.shipping_details.name,
                    "address": {
                        "line1": session.shipping_details.address.line1,
                        "line2": session.shipping_details.address.line2,
                        "city": session.shipping_details.address.city,
                        "state": session.shipping_details.address.state,
                        "postal_code": session.shipping_details.address.postal_code,
                        "country": session.shipping_details.address.country
                    }
                }
            
            await db.notecards_orders.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "customer_email": customer_email,
                    "customer_name": customer_name,
                    "shipping_address": shipping
                }}
            )
            
            # Refresh order data
            order = await db.notecards_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
            
            # Send order notification email
            background_tasks.add_task(send_notecards_order_notification, session_id)
        
        return {
            "payment_status": payment_status,
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "variant": order.get("variant"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    except Exception as e:
        logging.error(f"Error getting notecards checkout status: {str(e)}")
        return {
            "payment_status": order.get("payment_status", "unknown"),
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "variant": order.get("variant"),
            "variant_label": order.get("variant_label"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }


async def send_notecards_order_notification(session_id: str):
    """Send notecards order notification email to Roy."""
    settings = await get_settings()
    order = await db.notecards_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if not order:
        return
    
    shipping = order.get('shipping_address', {})
    shipping_address = shipping.get('address', {}) if shipping else {}
    shipping_name = shipping.get('name', 'N/A') if shipping else 'N/A'
    
    subject = f"📬 New Notecards Order: {order['order_number']}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
            ✉️ New Notecards Order!
        </h1>
        
        <p style="background: #e8f4ff; padding: 15px; border-radius: 4px;">
            <strong>Order Number:</strong> {order['order_number']}<br>
            <strong>Customer:</strong> {order.get('customer_name', 'N/A')}<br>
            <strong>Email:</strong> {order.get('customer_email', 'N/A')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
            {shipping_name}<br>
            {shipping_address.get('line1', 'N/A')}<br>
            {shipping_address.get('line2', '') + '<br>' if shipping_address.get('line2') else ''}
            {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('postal_code', '')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Notecard Design</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['product_title']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['variant_label']}</td>
            </tr>
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Price</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${order['price']:.2f}</td>
            </tr>
        </table>
        
        {"<h3 style='color: #333; margin-top: 30px;'>Special Instructions</h3><p style='background: #fff9e6; padding: 15px; border-left: 4px solid #f0ad4e;'>" + order['special_instructions'] + "</p>" if order.get('special_instructions') else ""}
        
        <p style="margin-top: 30px; padding: 15px; background: #d4edda; border-radius: 4px;">
            <strong>Stripe Payment ID:</strong> {session_id}
        </p>
    </div>
    """
    
    # Send to Roy
    roy_email = "roye@theobxbeachbum.com"
    
    if settings.smtp_host and settings.smtp_username:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.sender_email or settings.smtp_username
            msg['To'] = roy_email
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(msg['From'], [roy_email], msg.as_string())
            
            logging.info(f"Notecards order notification sent for {order['order_number']}")
        except Exception as e:
            logging.error(f"Failed to send notecards order notification: {e}")


# ============================================
# TEES Checkout Endpoints
# ============================================

@api_router.post("/tees/create-checkout-session")
async def create_tees_checkout(order: TeesOrderCreate):
    """Create Stripe checkout for tees purchase."""
    
    # Validate product exists
    product = await db.tees_products.find_one({"id": order.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Create order record
    tees_order = TeesOrder(
        product_id=order.product_id,
        product_title=order.product_title,
        product_type=order.product_type,
        size=order.size,
        price=order.price,
        special_instructions=order.special_instructions
    )
    await db.tees_orders.insert_one(tees_order.model_dump())
    
    # Create Stripe checkout
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Build product name
    product_name = f"{order.product_title} - {order.size}"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product_name,
                        "description": f"Beach Bum Tees - {order.product_type.title()}",
                        "images": [product.get("image_url")] if product.get("image_url") else []
                    },
                    "unit_amount": int(order.price * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=f"{order.origin_url}/tees-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{order.origin_url}/shop/tees",
            shipping_address_collection={"allowed_countries": ["US"]},
            metadata={
                "order_id": tees_order.id,
                "product_title": order.product_title,
                "product_type": order.product_type,
                "size": order.size,
                "special_instructions": order.special_instructions or ""
            }
        )
        
        # Update order with session ID
        await db.tees_orders.update_one(
            {"id": tees_order.id},
            {"$set": {"stripe_session_id": session.id}}
        )
        
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Tees checkout error: {error_msg}")
        raise HTTPException(500, f"Payment error: {error_msg}")


@api_router.get("/tees/checkout/status/{session_id}")
async def get_tees_checkout_status(session_id: str, background_tasks: BackgroundTasks):
    """Check tees order payment status and return order details."""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(500, "Stripe not configured")
    
    stripe.api_key = stripe_api_key
    if "sk_test_emergent" in stripe_api_key:
        stripe.api_base = "https://integrations.emergentagent.com/stripe"
    
    # Get order from database
    order = await db.tees_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    
    # If order is already marked as paid, return the stored data
    if order.get("payment_status") == "paid":
        return {
            "payment_status": "paid",
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    
    try:
        # Get session details from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        
        if payment_status == "paid":
            # Update order with customer details
            customer_email = session.customer_details.email if session.customer_details else None
            customer_name = session.customer_details.name if session.customer_details else None
            shipping = None
            if session.shipping_details:
                shipping = {
                    "name": session.shipping_details.name,
                    "address": {
                        "line1": session.shipping_details.address.line1,
                        "line2": session.shipping_details.address.line2,
                        "city": session.shipping_details.address.city,
                        "state": session.shipping_details.address.state,
                        "postal_code": session.shipping_details.address.postal_code,
                        "country": session.shipping_details.address.country
                    }
                }
            
            await db.tees_orders.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "customer_email": customer_email,
                    "customer_name": customer_name,
                    "shipping_address": shipping
                }}
            )
            
            # Refresh order data
            order = await db.tees_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
            
            # Send order notification email
            background_tasks.add_task(send_tees_order_notification, session_id)
        
        return {
            "payment_status": payment_status,
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }
    except Exception as e:
        logging.error(f"Error getting tees checkout status: {str(e)}")
        return {
            "payment_status": order.get("payment_status", "unknown"),
            "order_number": order.get("order_number"),
            "product_title": order.get("product_title"),
            "product_type": order.get("product_type"),
            "size": order.get("size"),
            "price": order.get("price"),
            "special_instructions": order.get("special_instructions"),
            "customer_email": order.get("customer_email"),
            "customer_name": order.get("customer_name"),
            "shipping_address": order.get("shipping_address"),
            "created_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }


async def send_tees_order_notification(session_id: str):
    """Send tees order notification email to Roy."""
    settings = await get_settings()
    order = await db.tees_orders.find_one({"stripe_session_id": session_id}, {"_id": 0})
    
    if not order:
        return
    
    shipping = order.get('shipping_address', {})
    shipping_address = shipping.get('address', {}) if shipping else {}
    shipping_name = shipping.get('name', 'N/A') if shipping else 'N/A'
    
    subject = f"👕 New Tees Order: {order['order_number']}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
            👕 New Tees Order!
        </h1>
        
        <p style="background: #e8f4ff; padding: 15px; border-radius: 4px;">
            <strong>Order Number:</strong> {order['order_number']}<br>
            <strong>Customer:</strong> {order.get('customer_name', 'N/A')}<br>
            <strong>Email:</strong> {order.get('customer_email', 'N/A')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Shipping Address</h3>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
            {shipping_name}<br>
            {shipping_address.get('line1', 'N/A')}<br>
            {shipping_address.get('line2', '') + '<br>' if shipping_address.get('line2') else ''}
            {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('postal_code', '')}
        </p>
        
        <h3 style="color: #333; margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Product</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['product_title']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Type</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['product_type'].title()}</td>
            </tr>
            <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Size</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">{order['size']}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Price</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${order['price']:.2f}</td>
            </tr>
        </table>
        
        {"<h3 style='color: #333; margin-top: 30px;'>Special Instructions</h3><p style='background: #fff9e6; padding: 15px; border-left: 4px solid #f0ad4e;'>" + order['special_instructions'] + "</p>" if order.get('special_instructions') else ""}
        
        <p style="margin-top: 30px; padding: 15px; background: #d4edda; border-radius: 4px;">
            <strong>Stripe Payment ID:</strong> {session_id}
        </p>
    </div>
    """
    
    # Send to Roy
    roy_email = "roye@theobxbeachbum.com"
    
    if settings.smtp_host and settings.smtp_username:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = settings.sender_email or settings.smtp_username
            msg['To'] = roy_email
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(msg['From'], [roy_email], msg.as_string())
            
            logging.info(f"Tees order notification sent for {order['order_number']}")
        except Exception as e:
            logging.error(f"Failed to send tees order notification: {e}")


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