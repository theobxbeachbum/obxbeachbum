import requests
import sys
import json
from datetime import datetime

class NewsletterAPITester:
    def __init__(self, base_url="https://photo-news.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with default password"""
        print("\n🔐 Testing Admin Authentication...")
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={"password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_admin_verify(self):
        """Test admin token verification"""
        if not self.token:
            self.log_test("Admin Verify", False, "No token available")
            return False
            
        success, _ = self.run_test(
            "Admin Token Verify",
            "GET",
            "admin/verify",
            200
        )
        return success

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings...")
        
        # Get settings
        success, settings = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        
        if success:
            # Update settings
            update_data = {
                "sender_email": "test@example.com",
                "stripe_enabled": True,
                "support_amount": 10.0
            }
            
            self.run_test(
                "Update Settings",
                "POST",
                "settings",
                200,
                data=update_data
            )

    def test_subscriber_endpoints(self):
        """Test subscriber management"""
        print("\n👥 Testing Subscribers...")
        
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        
        # Add subscriber
        success, response = self.run_test(
            "Add Subscriber",
            "POST",
            "subscribers",
            200,
            data={"email": test_email}
        )
        
        # List subscribers
        success, subscribers = self.run_test(
            "List Subscribers",
            "GET",
            "subscribers",
            200
        )
        
        # Export subscribers
        self.run_test(
            "Export Subscribers",
            "GET",
            "subscribers/export",
            200
        )
        
        # Remove subscriber
        if success and subscribers:
            self.run_test(
                "Remove Subscriber",
                "DELETE",
                f"subscribers/{test_email}",
                200
            )

    def test_post_endpoints(self):
        """Test post management"""
        print("\n📝 Testing Posts...")
        
        # Create post
        post_data = {
            "title": "Test Newsletter Post",
            "content": "This is a test newsletter post content.",
            "image_url": "https://example.com/test-image.jpg"
        }
        
        success, post = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        post_id = None
        if success and 'id' in post:
            post_id = post['id']
        
        # List posts
        success, posts = self.run_test(
            "List Posts",
            "GET",
            "posts",
            200
        )
        
        if post_id:
            # Get specific post
            self.run_test(
                "Get Post",
                "GET",
                f"posts/{post_id}",
                200
            )
            
            # Update post
            updated_data = {
                "title": "Updated Test Post",
                "content": "Updated content",
                "image_url": "https://example.com/updated-image.jpg"
            }
            
            self.run_test(
                "Update Post",
                "PUT",
                f"posts/{post_id}",
                200,
                data=updated_data
            )
            
            # Delete post
            self.run_test(
                "Delete Post",
                "DELETE",
                f"posts/{post_id}",
                200
            )

    def test_newsletter_sending(self):
        """Test newsletter sending (will fail without SendGrid config)"""
        print("\n📧 Testing Newsletter Sending...")
        
        # Create a test post first
        post_data = {
            "title": "Test Newsletter for Sending",
            "content": "This is a test newsletter for sending."
        }
        
        success, post = self.run_test(
            "Create Post for Newsletter",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        if success and 'id' in post:
            # Try to send newsletter (expected to fail without SendGrid config)
            self.run_test(
                "Send Newsletter (Expected to Fail)",
                "POST",
                "newsletter/send",
                400,  # Expected to fail with 400 due to missing SendGrid config
                data={"post_id": post['id']}
            )

    def test_supporter_endpoints(self):
        """Test supporter/Stripe endpoints"""
        print("\n💰 Testing Supporter Endpoints...")
        
        # List supporters
        self.run_test(
            "List Supporters",
            "GET",
            "supporters",
            200
        )
        
        # Test checkout creation (may fail if Stripe not properly configured)
        checkout_data = {
            "email": "supporter@example.com",
            "origin_url": "https://example.com"
        }
        
        # This might fail if Stripe is not configured, but we'll test the endpoint
        success, response = self.run_test(
            "Create Supporter Checkout",
            "POST",
            "supporters/checkout",
            200,
            data=checkout_data
        )

    def test_markdown_conversion(self):
        """Test Markdown to HTML conversion feature"""
        print("\n📄 Testing Markdown to HTML Conversion...")
        
        # Create a test post with Markdown content including all required elements
        markdown_content = """# A Beautiful Beach Day

This is a **beautiful** day at the beach. The sun is shining and the waves are *gently* lapping at the shore.

![Beach Scene](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800)

Here are some things to do at the beach:

1. Build sandcastles
2. Go swimming
3. Collect seashells
4. Watch the sunset

## Activities for Everyone

Whether you're young or old, there's something for everyone at the beach.

---

Remember to bring sunscreen and stay hydrated!"""

        post_data = {
            "title": "A Beautiful Beach Day",
            "content": markdown_content,
            "slug": "a-beautiful-beach-day"
        }
        
        # Create the test post
        success, post = self.run_test(
            "Create Markdown Test Post",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        post_id = None
        if success and 'id' in post:
            post_id = post['id']
            
            # Publish the post by sending newsletter (this sets status to published)
            self.run_test(
                "Publish Test Post",
                "POST",
                "newsletter/send",
                200,
                data={"post_id": post_id}
            )
        
        # Test public posts list endpoint
        temp_token = self.token
        self.token = None  # Remove auth for public test
        
        success, posts = self.run_test(
            "Get Public Posts List",
            "GET",
            "public/posts",
            200
        )
        
        if success:
            # Verify posts list returns data
            if isinstance(posts, list) and len(posts) > 0:
                self.log_test("Public Posts List Contains Data", True, f"Found {len(posts)} posts")
            else:
                self.log_test("Public Posts List Contains Data", False, "No posts found in list")
        
        # Test specific post by slug with HTML conversion
        success, post_response = self.run_test(
            "Get Public Post by Slug",
            "GET",
            "public/posts/a-beautiful-beach-day",
            200
        )
        
        if success and 'content' in post_response:
            html_content = post_response['content']
            
            # Test for required HTML tags
            required_tags = [
                ('<h1>', 'H1 header tag'),
                ('<h2>', 'H2 header tag'),
                ('<strong>', 'Strong/bold tag'),
                ('<em>', 'Em/italic tag'),
                ('<img', 'Image tag'),
                ('<ol>', 'Ordered list tag'),
                ('<li>', 'List item tag'),
                ('<hr', 'Horizontal rule tag'),
                ('<p>', 'Paragraph tag')
            ]
            
            for tag, description in required_tags:
                if tag in html_content:
                    self.log_test(f"HTML Conversion - {description}", True, f"Found {tag}")
                else:
                    self.log_test(f"HTML Conversion - {description}", False, f"Missing {tag}")
            
            # Verify image has proper src attribute
            if '<img' in html_content and 'src=' in html_content:
                self.log_test("HTML Conversion - Image src attribute", True, "Image has src attribute")
            else:
                self.log_test("HTML Conversion - Image src attribute", False, "Image missing src attribute")
            
            # Verify no raw Markdown syntax remains in HTML
            markdown_syntax = ['**', '*', '#', '![', '](', '---']
            has_markdown = any(syntax in html_content for syntax in markdown_syntax)
            
            if not has_markdown:
                self.log_test("HTML Conversion - No Raw Markdown", True, "No Markdown syntax found in HTML")
            else:
                found_syntax = [syntax for syntax in markdown_syntax if syntax in html_content]
                self.log_test("HTML Conversion - No Raw Markdown", False, f"Found Markdown syntax: {found_syntax}")
        
        # Restore auth token
        self.token = temp_token

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Test public subscriber endpoint (without auth)
        temp_token = self.token
        self.token = None  # Remove auth for public test
        
        test_email = f"public_test_{datetime.now().strftime('%H%M%S')}@example.com"
        
        self.run_test(
            "Public Subscribe",
            "POST",
            "subscribers",
            200,
            data={"email": test_email}
        )
        
        # Test embed form endpoint
        try:
            response = requests.get(f"{self.api_url}/embed/subscribe", timeout=10)
            success = response.status_code == 200 and 'html' in response.headers.get('content-type', '').lower()
            self.log_test("Embed Subscribe Form", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Embed Subscribe Form", False, f"Error: {str(e)}")
        
        # Restore auth token
        self.token = temp_token

    def test_unsubscribe_endpoint(self):
        """Test unsubscribe endpoint"""
        print("\n🚫 Testing Unsubscribe...")
        
        # Test with invalid token (should return 404)
        self.run_test(
            "Unsubscribe Invalid Token",
            "GET",
            "unsubscribe?token=invalid_token",
            404
        )

    def test_print_gallery_endpoints(self):
        """Test Print Gallery endpoints"""
        print("\n🖼️ Testing Print Gallery...")
        
        # Remove auth for public endpoints
        temp_token = self.token
        self.token = None
        
        # Test GET /api/prints/pricing
        success, pricing_data = self.run_test(
            "Get Print Pricing",
            "GET",
            "prints/pricing",
            200
        )
        
        if success:
            # Verify pricing structure
            if 'pricing' in pricing_data and 'type_names' in pricing_data:
                self.log_test("Print Pricing Structure", True, "Contains pricing and type_names")
                
                # Check for required print types
                pricing = pricing_data.get('pricing', {})
                required_types = ['paper', 'canvas', 'metal']
                for print_type in required_types:
                    if print_type in pricing:
                        self.log_test(f"Print Pricing - {print_type} type", True, f"Found {print_type} pricing")
                        
                        # Check if pricing has size/price pairs
                        type_pricing = pricing[print_type]
                        if isinstance(type_pricing, dict) and len(type_pricing) > 0:
                            self.log_test(f"Print Pricing - {print_type} sizes", True, f"Found {len(type_pricing)} sizes")
                        else:
                            self.log_test(f"Print Pricing - {print_type} sizes", False, "No sizes found")
                    else:
                        self.log_test(f"Print Pricing - {print_type} type", False, f"Missing {print_type} pricing")
            else:
                self.log_test("Print Pricing Structure", False, "Missing pricing or type_names")
        
        # Test GET /api/public/gallery
        success, gallery_data = self.run_test(
            "Get Public Gallery",
            "GET",
            "public/gallery",
            200
        )
        
        if success:
            if isinstance(gallery_data, list):
                self.log_test("Public Gallery Format", True, f"Returns list with {len(gallery_data)} items")
                
                # If there are items, check structure
                if len(gallery_data) > 0:
                    first_item = gallery_data[0]
                    required_fields = ['id', 'title', 'image_url', 'tags', 'available_types']
                    for field in required_fields:
                        if field in first_item:
                            self.log_test(f"Gallery Item - {field} field", True, f"Found {field}")
                        else:
                            self.log_test(f"Gallery Item - {field} field", False, f"Missing {field}")
                else:
                    self.log_test("Public Gallery Content", True, "Gallery is empty (no prints configured)")
            else:
                self.log_test("Public Gallery Format", False, "Does not return a list")
        
        # Test GET /api/public/gallery/tags
        success, tags_data = self.run_test(
            "Get Gallery Tags",
            "GET",
            "public/gallery/tags",
            200
        )
        
        if success:
            if isinstance(tags_data, list):
                self.log_test("Gallery Tags Format", True, f"Returns list with {len(tags_data)} tags")
            else:
                self.log_test("Gallery Tags Format", False, "Does not return a list")
        
        # Test gallery with tag filter
        success, filtered_gallery = self.run_test(
            "Get Gallery with Tag Filter",
            "GET",
            "public/gallery?tag=beach",
            200
        )
        
        if success:
            if isinstance(filtered_gallery, list):
                self.log_test("Gallery Tag Filter", True, f"Tag filter works, returns {len(filtered_gallery)} items")
            else:
                self.log_test("Gallery Tag Filter", False, "Tag filter does not return a list")
        
        # Restore auth token
        self.token = temp_token
        
        # Test admin print endpoints (with auth)
        print("\n🔐 Testing Admin Print Management...")
        
        # Test GET /api/prints (admin)
        success, admin_prints = self.run_test(
            "Get Admin Prints List",
            "GET",
            "prints",
            200
        )
        
        if success:
            if isinstance(admin_prints, list):
                self.log_test("Admin Prints Format", True, f"Returns list with {len(admin_prints)} prints")
            else:
                self.log_test("Admin Prints Format", False, "Does not return a list")
        
        # Test creating a print
        test_print_data = {
            "title": "Test Beach Print",
            "description": "A beautiful test beach scene",
            "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
            "tags": ["beach", "sunset", "test"],
            "available_types": ["paper", "canvas", "metal"],
            "featured": False,
            "active": True
        }
        
        success, created_print = self.run_test(
            "Create Print",
            "POST",
            "prints",
            200,
            data=test_print_data
        )
        
        print_id = None
        if success and 'id' in created_print:
            print_id = created_print['id']
            self.log_test("Print Creation", True, f"Created print with ID: {print_id}")
            
            # Test updating the print
            update_data = {
                "title": "Updated Test Beach Print",
                "featured": True
            }
            
            success, updated_print = self.run_test(
                "Update Print",
                "PUT",
                f"prints/{print_id}",
                200,
                data=update_data
            )
            
            if success:
                if updated_print.get('title') == "Updated Test Beach Print":
                    self.log_test("Print Update Verification", True, "Title updated correctly")
                else:
                    self.log_test("Print Update Verification", False, "Title not updated")
            
            # Test deleting the print
            success, _ = self.run_test(
                "Delete Print",
                "DELETE",
                f"prints/{print_id}",
                200
            )
        
        # Test print checkout (will likely fail without proper Stripe setup)
        print("\n💳 Testing Print Checkout...")
        
        checkout_data = {
            "print_id": "test-print-id",
            "print_title": "Test Print",
            "print_type": "paper",
            "size": "8x12",
            "price": 35.0,
            "special_instructions": "Handle with care",
            "origin_url": "https://example.com",
            "source": "gallery"
        }
        
        # This will likely fail due to Stripe configuration, but we test the endpoint
        success, checkout_response = self.run_test(
            "Create Print Checkout",
            "POST",
            "prints/checkout",
            200,
            data=checkout_data
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Newsletter API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication first
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
        
        self.test_admin_verify()
        
        # Test all endpoints
        self.test_settings_endpoints()
        self.test_subscriber_endpoints()
        self.test_post_endpoints()
        self.test_markdown_conversion()  # Add Markdown conversion tests
        self.test_newsletter_sending()
        self.test_supporter_endpoints()
        self.test_public_endpoints()
        self.test_unsubscribe_endpoint()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = NewsletterAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())