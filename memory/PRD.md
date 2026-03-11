# the OBX Beach Bum - Product Requirements Document

## Overview
A self-hosted newsletter system similar to Substack for a personal photography website. The platform includes a public-facing website/archive, subscriber management, email delivery, and a print sales gallery for e-commerce.

## Core Features

### 1. Newsletter System
- Write and publish posts with Markdown support
- Collect email subscribers
- Send newsletters via SMTP2GO
- Subscriber management (view, export, unsubscribe)

### 2. Supporter Model
- Stripe integration for one-time payments/donations
- Supporter subscription management

### 3. Print Sales Gallery (E-commerce)
- Public gallery page with responsive thumbnail grid
- Tag-based filtering and search
- Product detail modal with type/size selectors
- Dynamic pricing for paper, canvas, and metal prints
- Stripe checkout for print purchases
- Shipping address collection (US only)
- Order notification emails to admin

### 4. Admin Dashboard
- Password-protected admin panel (/admin/login)
- Post management (create, edit, publish)
- Print management (add, edit, toggle active/featured)
- Subscriber management
- Settings configuration (SMTP, Bunny CDN, Stripe)

### 5. Content Delivery
- Direct image uploads via Bunny.net CDN
- Support for multiple inline images per post
- Featured image support for posts

## Tech Stack
- **Frontend:** React, React Router
- **Backend:** FastAPI, Pydantic
- **Database:** MongoDB
- **Integrations:** Stripe (payments), Bunny.net (CDN), SMTP2GO (email)

## What's Been Implemented

### December 2025 - March 2025
- Full newsletter system with subscriber management
- Markdown support for posts with inline images
- Stripe supporter checkout integration
- Public homepage redesign to Substack-style layout
- Admin dashboard with complete CRUD operations
- Print Sales Gallery feature:
  - Backend APIs for prints, pricing, and orders
  - Admin interface for print management
  - Public gallery page with filtering
  - Product detail modal with type/size selectors
  - **Stripe checkout integration (FIXED - March 11, 2025)**

### Bug Fixes
- **March 11, 2025:** Fixed Stripe checkout for print sales
  - Issue: 500 Internal Server Error due to `AttributeError` with `stripe.error.StripeError`
  - Root cause: emergentintegrations library incompatibility with stripe 13.x
  - Solution: Bypassed library wrapper, used Stripe SDK directly with proper error handling

## Pending Tasks

### P1 (High Priority)
- Complete placeholder pages for "B.B. Muggs," "Beach Bum Tees," and "Notecards" with "Coming Soon" text

### P2 (Medium Priority)
- Security Vulnerabilities:
  - Implement dynamic JWT tokens with expiration
  - Add rate limiting to login endpoint
  - Sanitize HTML output from Markdown (XSS mitigation)
- Code Refactoring:
  - Split `/app/backend/server.py` into router modules
  - Break up `/app/frontend/src/App.css` into component-specific files

### Future/Backlog
- Full e-commerce store integration per SPECIFICATION.md
- Order management dashboard in admin

## Database Schema

### posts
```json
{
  "id": "string",
  "title": "string",
  "slug": "string",
  "content": "string (Markdown)",
  "image_url": "string (featured image)",
  "image_urls": ["array of strings"],
  "status": "draft|published",
  "available_for_purchase": "boolean",
  "created_at": "datetime",
  "published_at": "datetime"
}
```

### prints
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "image_url": "string",
  "tags": ["array of strings"],
  "available_types": ["paper", "canvas", "metal"],
  "featured": "boolean",
  "active": "boolean",
  "sort_order": "integer",
  "created_at": "datetime"
}
```

### print_orders
```json
{
  "id": "string",
  "print_id": "string",
  "print_title": "string",
  "print_type": "string",
  "size": "string",
  "price": "float",
  "special_instructions": "string",
  "stripe_session_id": "string",
  "customer_email": "string",
  "payment_status": "pending|paid",
  "order_number": "string",
  "created_at": "datetime"
}
```

### subscribers
```json
{
  "id": "string",
  "email": "string",
  "subscribed_at": "datetime",
  "status": "active|unsubscribed",
  "unsubscribe_token": "string"
}
```

## Key API Endpoints

### Public
- `GET /api/posts` - List published posts
- `GET /api/posts/{slug}` - Get single post
- `POST /api/subscribe` - Subscribe to newsletter
- `GET /api/prints` - List active prints for gallery
- `GET /api/prints/pricing` - Get pricing structure
- `POST /api/prints/checkout` - Create Stripe checkout session

### Admin
- `POST /api/admin/login` - Admin authentication
- `GET/POST /api/admin/posts` - Post management
- `GET/POST /api/admin/prints` - Print management
- `GET /api/admin/subscribers` - Subscriber list
- `PUT /api/admin/settings` - Update settings

## Third-Party Integrations
- **Stripe:** Payment processing (test key: sk_test_emergent)
- **Bunny.net:** Image CDN (requires user API key)
- **SMTP2GO:** Email delivery (requires user API key)
