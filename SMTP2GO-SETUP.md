# SMTP2GO Setup Guide

## Getting Your SMTP2GO Credentials

Since you already have an SMTP2GO account, here's how to get the credentials needed for your newsletter system:

### Step 1: Login to SMTP2GO
Go to https://www.smtp2go.com/ and login to your account.

### Step 2: Get Your SMTP Username
1. Click on **"Sending"** in the main menu
2. Click on **"SMTP Users"**
3. You'll see your existing SMTP users listed
4. Copy your **Username** (e.g., `your-username@smtp2go.com`)

### Step 3: Get Your SMTP Password or API Key

**Option A: Use SMTP Password (Recommended for SMTP)**
1. In the SMTP Users section, click on your username
2. View or reset your **SMTP Password**
3. Copy this password - you'll use it in the Settings

**Option B: Use API Key (Alternative)**
1. Go to **"Sending" → "API Keys"**
2. Click **"Add API Key"**
3. Give it a name like "Newsletter System"
4. Copy the generated API key
5. You can use this as your SMTP password

### Step 4: Verify Your Sender Email
1. Go to **"Sending" → "Verified Senders"**
2. Add your sender domain (e.g., `yourdomain.com`)
3. Follow DNS verification instructions (add TXT or CNAME record)
4. Once verified, you can send from any address at that domain

### Step 5: Configure in Your Newsletter Admin

Login to your newsletter admin panel:
https://photo-letter.preview.emergentagent.com/admin/login

Go to **Settings** and enter:

- **SMTP Username**: Your SMTP2GO username
- **SMTP Password**: Your SMTP2GO password or API key
- **Sender Email**: `newsletter@yourdomain.com` (must be verified)
- **SMTP Host**: `mail.smtp2go.com` (default)
- **SMTP Port**: `587` (default, recommended)

### Common SMTP2GO Ports:
- **587** - Recommended (TLS encryption)
- **2525** - Alternative if 587 is blocked
- **8025** - Another alternative
- **25** - Standard but often blocked by ISPs

### Testing Your Setup

After configuring:
1. Create a test newsletter post
2. Add yourself as a subscriber
3. Send the newsletter
4. Check your SMTP2GO dashboard → Activity to see the send status

### Troubleshooting

**"Authentication failed"**
- Double-check username and password
- Make sure you're using the SMTP password, not your account password

**"Sender not verified"**
- Verify your domain in SMTP2GO
- Wait for DNS propagation (can take up to 48 hours)

**"Connection timeout"**
- Try a different port (2525 or 8025)
- Check if your firewall blocks SMTP ports

### SMTP2GO Free Tier Limits:
- 1,000 emails per month
- Perfect for starting your newsletter
- Upgrade as you grow

## Support

If you need help, SMTP2GO has great support:
- Email: support@smtp2go.com
- Live chat: Available in dashboard
- Documentation: https://www.smtp2go.com/docs/

---

**You're all set!** Once configured, your newsletter system will send emails through SMTP2GO instead of SendGrid.
