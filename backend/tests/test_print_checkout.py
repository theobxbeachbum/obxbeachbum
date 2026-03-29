"""
Test suite for Print Checkout functionality from PostView page
Tests the Buy This Print feature for blog posts with available_for_purchase=true
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://beach-bum-merch.preview.emergentagent.com')

class TestPrintPricing:
    """Tests for /api/prints/pricing endpoint"""
    
    def test_get_pricing_returns_200(self):
        """Verify pricing endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        assert response.status_code == 200
        print("SUCCESS: Pricing endpoint returns 200")
    
    def test_pricing_contains_all_types(self):
        """Verify pricing contains paper, canvas, and metal types"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        data = response.json()
        
        assert "pricing" in data
        assert "paper" in data["pricing"]
        assert "canvas" in data["pricing"]
        assert "metal" in data["pricing"]
        print("SUCCESS: Pricing contains all print types")
    
    def test_pricing_contains_type_names(self):
        """Verify type_names are returned"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        data = response.json()
        
        assert "type_names" in data
        assert data["type_names"]["paper"] == "Fine Art Paper Print"
        assert data["type_names"]["canvas"] == "Canvas Wall Art"
        assert data["type_names"]["metal"] == "Metal Print"
        print("SUCCESS: Type names are correct")
    
    def test_paper_pricing_values(self):
        """Verify paper print pricing values"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        data = response.json()
        
        paper = data["pricing"]["paper"]
        assert paper["5x7"] == 25
        assert paper["8x12"] == 35
        assert paper["12x18"] == 58
        print("SUCCESS: Paper pricing values are correct")
    
    def test_canvas_pricing_values(self):
        """Verify canvas print pricing values"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        data = response.json()
        
        canvas = data["pricing"]["canvas"]
        assert canvas["8x12"] == 87
        assert canvas["12x18"] == 120
        print("SUCCESS: Canvas pricing values are correct")
    
    def test_metal_pricing_values(self):
        """Verify metal print pricing values"""
        response = requests.get(f"{BASE_URL}/api/prints/pricing")
        data = response.json()
        
        metal = data["pricing"]["metal"]
        assert metal["4x6"] == 37
        assert metal["8x12"] == 77
        print("SUCCESS: Metal pricing values are correct")


class TestPublicPostEndpoint:
    """Tests for /api/public/posts/{slug} endpoint"""
    
    def test_get_post_by_slug(self):
        """Verify post can be fetched by slug"""
        response = requests.get(f"{BASE_URL}/api/public/posts/like-a-dream")
        assert response.status_code == 200
        print("SUCCESS: Post fetched by slug")
    
    def test_post_has_available_for_purchase_field(self):
        """Verify post has available_for_purchase field"""
        response = requests.get(f"{BASE_URL}/api/public/posts/like-a-dream")
        data = response.json()
        
        assert "available_for_purchase" in data
        assert data["available_for_purchase"] == True
        print("SUCCESS: Post has available_for_purchase=true")
    
    def test_post_has_image_url(self):
        """Verify post has image_url for print purchase"""
        response = requests.get(f"{BASE_URL}/api/public/posts/like-a-dream")
        data = response.json()
        
        assert "image_url" in data
        assert data["image_url"] is not None
        assert data["image_url"].startswith("http")
        print(f"SUCCESS: Post has image_url: {data['image_url'][:50]}...")
    
    def test_post_not_found_returns_404(self):
        """Verify non-existent post returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/posts/non-existent-post-slug")
        assert response.status_code == 404
        print("SUCCESS: Non-existent post returns 404")


class TestPrintCheckout:
    """Tests for /api/prints/checkout endpoint"""
    
    def test_checkout_with_valid_paper_order(self):
        """Test checkout with valid paper print order"""
        payload = {
            "print_id": "test-post-123",
            "print_title": "Test Print",
            "print_type": "paper",
            "size": "5x7",
            "price": 25,
            "image_url": "https://example.com/image.jpg",
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "checkout_url" in data
        assert "stripe.com" in data["checkout_url"]
        print(f"SUCCESS: Checkout URL returned: {data['checkout_url'][:60]}...")
    
    def test_checkout_with_valid_canvas_order(self):
        """Test checkout with valid canvas print order"""
        payload = {
            "print_id": "test-post-456",
            "print_title": "Canvas Test",
            "print_type": "canvas",
            "size": "8x12",
            "price": 87,
            "image_url": "https://example.com/image.jpg",
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "checkout_url" in data
        print("SUCCESS: Canvas checkout works")
    
    def test_checkout_with_valid_metal_order(self):
        """Test checkout with valid metal print order"""
        payload = {
            "print_id": "test-post-789",
            "print_title": "Metal Test",
            "print_type": "metal",
            "size": "4x6",
            "price": 37,
            "image_url": "https://example.com/image.jpg",
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "checkout_url" in data
        print("SUCCESS: Metal checkout works")
    
    def test_checkout_with_invalid_print_type(self):
        """Test checkout rejects invalid print type"""
        payload = {
            "print_id": "test-post-invalid",
            "print_title": "Invalid Type Test",
            "print_type": "invalid_type",
            "size": "5x7",
            "price": 25,
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 400
        print("SUCCESS: Invalid print type rejected with 400")
    
    def test_checkout_with_invalid_size(self):
        """Test checkout rejects invalid size for print type"""
        payload = {
            "print_id": "test-post-invalid-size",
            "print_title": "Invalid Size Test",
            "print_type": "paper",
            "size": "100x100",  # Invalid size
            "price": 25,
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 400
        print("SUCCESS: Invalid size rejected with 400")
    
    def test_checkout_with_price_mismatch(self):
        """Test checkout rejects price mismatch"""
        payload = {
            "print_id": "test-post-price-mismatch",
            "print_title": "Price Mismatch Test",
            "print_type": "paper",
            "size": "5x7",
            "price": 999,  # Wrong price (should be 25)
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 400
        print("SUCCESS: Price mismatch rejected with 400")
    
    def test_checkout_returns_session_id(self):
        """Test checkout returns session_id for status tracking"""
        payload = {
            "print_id": "test-session-id",
            "print_title": "Session ID Test",
            "print_type": "paper",
            "size": "8x12",
            "price": 35,
            "origin_url": "https://beach-bum-merch.preview.emergentagent.com",
            "source": "post"
        }
        
        response = requests.post(f"{BASE_URL}/api/prints/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "session_id" in data
        assert data["session_id"].startswith("cs_")
        print(f"SUCCESS: Session ID returned: {data['session_id'][:30]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
