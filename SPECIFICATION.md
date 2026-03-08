# The OBX Beach Bum - Newsletter System Specification

## Project Overview

A self-hosted newsletter system similar to Substack, built for a personal photography website. Allows creating and publishing newsletter posts with inline images, managing subscribers, sending emails, and accepting supporter payments.

**Live URL:** theobxbeachbum.com (when deployed)
**Admin Access:** `/admin/login`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, Axios, Lucide Icons |
| Backend | FastAPI (Python), Pydantic |
| Database | MongoDB (Motor async driver) |
| Styling | Custom CSS (Substack-inspired design) |
| Email | SMTP2GO (SMTP) |
| Image CDN | Bunny.net Storage + Pull Zone |
| Payments | Stripe (via emergentintegrations) |

---

## Features Implemented

### Public Features
- ✅ Homepage with featured post hero + post list
- ✅ Individual post pages with HTML rendering
- ✅ Subscribe page for email signup
- ✅ Unsubscribe handling via token
- ✅ Support/donate page (Stripe integration)
- ✅ "Add to Home Screen" instructions page
- ✅ Responsive design (mobile-friendly)

### Admin Features
- ✅ Password-protected admin dashboard
- ✅ Create/edit/delete posts with Markdown support
- ✅ Direct image upload to Bunny.net CDN
- ✅ Send newsletters to all subscribers
- ✅ Subscriber management (view, add, remove, export CSV)
- ✅ View supporters/payments
- ✅ Settings management (email, Stripe, Bunny.net config)

### Content Features
- ✅ Markdown-to-HTML conversion for posts
- ✅ Inline image support via Markdown syntax `![alt](url)`
- ✅ Auto-generated URL slugs from titles
- ✅ Draft/Published status
- ✅ Plain text email fallback

---

## Database Models (MongoDB Collections)

### posts
```javascript
{
  id: "uuid-string",
  title: "Post Title",
  content: "Markdown content with ![images](url)",
  slug: "post-title",
  image_url: "optional-featured-image-url",
  image_urls: ["array", "of", "image", "urls"],
  status: "draft" | "published",
  created_at: "ISO datetime",
  published_at: "ISO datetime or null"
}
```

### subscribers
```javascript
{
  id: "uuid-string",
  email: "subscriber@example.com",
  status: "active" | "unsubscribed",
  subscribed_at: "ISO datetime",
  unsubscribe_token: "random-secure-token"
}
```

### supporters
```javascript
{
  id: "uuid-string",
  email: "supporter@example.com",
  stripe_customer_id: "optional",
  stripe_subscription_id: "optional",
  status: "active",
  amount: 5.00,
  created_at: "ISO datetime"
}
```

### payment_transactions
```javascript
{
  id: "uuid-string",
  session_id: "stripe-session-id",
  email: "payer@example.com",
  amount: 5.00,
  currency: "usd",
  payment_status: "pending" | "paid",
  metadata: {},
  created_at: "ISO datetime",
  updated_at: "ISO datetime"
}
```

### settings
```javascript
{
  id: "settings",
  admin_password_hash: "bcrypt-hash",
  sender_email: "you@yourdomain.com",
  smtp_host: "mail.smtp2go.com",
  smtp_port: 587,
  smtp_username: "your-smtp-username",
  smtp_password: "your-smtp-password",
  stripe_enabled: true,
  stripe_price_id: "optional",
  support_amount: 5.00,
  bunny_storage_api_key: "your-key",
  bunny_storage_zone: "your-zone",
  bunny_storage_region: "ny",
  bunny_pull_zone_url: "https://yourzone.b-cdn.net"
}
```

---

## API Endpoints

### Public Endpoints (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/posts` | List all published posts |
| GET | `/api/public/posts/{slug}` | Get single post (HTML content) |
| POST | `/api/subscribers` | Subscribe email |
| GET | `/api/unsubscribe?token=xxx` | Unsubscribe |
| POST | `/api/supporters/checkout` | Create Stripe checkout |
| GET | `/api/supporters/checkout/status/{session_id}` | Check payment status |
| GET | `/api/embed/subscribe` | Embeddable subscribe form (HTML) |

### Admin Endpoints (Requires Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Login, returns token |
| GET | `/api/admin/verify` | Verify token valid |
| GET | `/api/posts` | List all posts (admin) |
| GET | `/api/posts/{post_id}` | Get single post |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/{post_id}` | Update post |
| DELETE | `/api/posts/{post_id}` | Delete post |
| GET | `/api/subscribers` | List active subscribers |
| DELETE | `/api/subscribers/{email}` | Remove subscriber |
| GET | `/api/subscribers/export` | Export CSV |
| POST | `/api/newsletter/send` | Send post to all subscribers |
| POST | `/api/upload-image` | Upload image to Bunny.net |
| GET | `/api/settings` | Get settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/supporters` | List supporters |

---

## Frontend Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | PublicHome.js | Substack-style homepage |
| `/post/:slug` | PostView.js | Individual post page |
| `/subscribe` | Subscribe.js | Email signup form |
| `/unsubscribe` | Unsubscribe.js | Unsubscribe confirmation |
| `/support` | Support.js | Supporter payment page |
| `/supporter-success` | SupporterSuccess.js | Payment success |
| `/add-to-homescreen` | AddToHomeScreen.js | Mobile bookmark instructions |
| `/admin/login` | AdminLogin.js | Admin password login |
| `/admin/dashboard` | Dashboard.js | Admin overview |
| `/admin/posts` | Posts.js | Manage posts |
| `/admin/subscribers` | Subscribers.js | Manage subscribers |
| `/admin/supporters` | Supporters.js | View supporters |
| `/admin/settings` | Settings.js | Configure integrations |

---

## Key Implementation Details

### Markdown to HTML Conversion
```python
import markdown

def convert_markdown_to_html(content: str) -> str:
    md = markdown.Markdown(extensions=['nl2br', 'fenced_code', 'tables'])
    return md.convert(content)
```

### Plain Text Extraction (for email fallback)
```python
def strip_markdown_for_plain_text(content: str) -> str:
    import re
    text = re.sub(r'!\[.*?\]\(.*?\)', '', content)  # Remove images
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)  # Links to text
    text = re.sub(r'\*\*?(.*?)\*\*?', r'\1', text)   # Bold/italic
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)  # Headers
    return text.strip()
```

### Email Sending (SMTP2GO)
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

msg = MIMEMultipart('alternative')
msg['Subject'] = post.title
msg['From'] = settings.sender_email
msg['To'] = subscriber.email
msg.attach(MIMEText(plain_text, 'plain'))
msg.attach(MIMEText(html_content, 'html'))

with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
    server.starttls()
    server.login(settings.smtp_username, settings.smtp_password)
    server.sendmail(sender, [recipient], msg.as_string())
```

### Image Upload to Bunny.net
```python
upload_url = f"https://{endpoint}/{storage_zone}/newsletter-images/{filename}"
headers = {"AccessKey": api_key, "Content-Type": content_type}
response = await httpx.put(upload_url, content=file_bytes, headers=headers)
cdn_url = f"{pull_zone_url}/newsletter-images/{filename}"
```

### Stripe Checkout (emergentintegrations)
```python
from emergentintegrations.payments.stripe.checkout import StripeCheckout

stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
session = await stripe_checkout.create_checkout_session(checkout_request)
```

---

## File Structure

```
/app
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main router
│   │   ├── App.css        # All styles (including Substack layout)
│   │   ├── pages/
│   │   │   ├── PublicHome.js      # Substack-style homepage
│   │   │   ├── PostView.js        # Individual post page
│   │   │   ├── Subscribe.js       # Subscription form
│   │   │   ├── Unsubscribe.js     # Unsubscribe page
│   │   │   ├── Support.js         # Supporter payment
│   │   │   ├── SupporterSuccess.js
│   │   │   ├── AddToHomeScreen.js # Mobile instructions
│   │   │   ├── AdminLogin.js      # Admin login
│   │   │   ├── Dashboard.js       # Admin dashboard
│   │   │   ├── Posts.js           # Post management
│   │   │   ├── Subscribers.js     # Subscriber management
│   │   │   ├── Supporters.js      # View supporters
│   │   │   └── Settings.js        # Settings management
│   │   └── components/
│   │       ├── AdminLayout.js     # Admin sidebar layout
│   │       └── ui/                # shadcn components
│   ├── package.json
│   └── .env               # REACT_APP_BACKEND_URL
│
└── test_result.md         # Testing documentation
```

---

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=newsletter_db
STRIPE_API_KEY=sk_test_xxx (already in pod environment)
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-domain.com
```

---

## Third-Party Integration Setup

### SMTP2GO
1. Sign up at smtp2go.com
2. Verify sender domain/email
3. Get SMTP credentials
4. Add to Settings in admin panel

### Bunny.net CDN
1. Create storage zone at bunny.net
2. Create pull zone linked to storage
3. Get API key from account settings
4. Add to Settings: zone name, region, pull zone URL

### Stripe
1. API key is pre-configured in Emergent environment
2. Enable in Settings and set support amount
3. Uses emergentintegrations library

---

## Branding Assets

**Logo:** https://customer-assets.emergentagent.com/job_photo-news/artifacts/cuzl8frm_obxbb-logo.jpg

**Site Name:** the OBX Beach Bum

**Color Scheme:**
- Primary: #1a1a1a (dark)
- Background: #fff, #f9f9f9, #f7f7f7
- Footer: #2a3a4a (dark slate)
- iPhone card gradient: #667eea → #764ba2
- Android card gradient: #11998e → #38ef7d

**Fonts:**
- Headings: 'Playfair Display', Georgia, serif
- Body: 'Crimson Text', Georgia, serif

---

## Security Notes

⚠️ **Current Limitations (should address for production):**
- Admin token is static ("admin_session_token") - should implement JWT with expiration
- No rate limiting on login endpoint
- XSS potential with dangerouslySetInnerHTML - consider HTML sanitization

✅ **What's secure:**
- Passwords hashed with bcrypt
- Secrets in environment variables
- Unsubscribe tokens are cryptographically random
- MongoDB queries are parameterized

---

## How to Use (Quick Reference)

### Creating a Post
1. Admin → Posts → New Post
2. Write title and content using Markdown
3. Click "Insert Image" to upload photos
4. Images insert as `![](url)` at cursor position
5. Save or publish

### Markdown Cheatsheet
```markdown
# Heading 1
## Heading 2
**bold text**
*italic text*
![Image description](https://image-url.jpg)
1. Numbered list
- Bullet list
---  (horizontal rule)
```

### Sending Newsletter
1. Go to Posts
2. Click envelope icon on the post
3. Confirm to send to all subscribers
4. Post is marked as "published"

---

*Document created: Ready for new build reference*
