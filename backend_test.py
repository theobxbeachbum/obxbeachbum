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