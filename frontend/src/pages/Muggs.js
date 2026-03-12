import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Coffee, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Coaster variants pricing
const COASTER_VARIANTS = [
  { id: 'single', label: 'Single', price: 7 },
  { id: 'set-2', label: 'Set of 2', price: 12 },
  { id: 'set-4', label: 'Set of 4', price: 21 }
];

function ProductCard({ product }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.has_variants ? COASTER_VARIANTS[0] : null
  );
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const currentPrice = product.has_variants 
    ? selectedVariant?.price 
    : product.price;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const orderData = {
        product_id: product.id,
        product_title: product.title,
        product_type: product.product_type,
        variant: selectedVariant?.id || null,
        variant_label: selectedVariant?.label || null,
        price: currentPrice,
        special_instructions: specialInstructions || null,
        origin_url: window.location.origin
      };

      const response = await axios.post(`${BACKEND_URL}/api/muggs/checkout`, orderData);
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="muggs-product-card" data-testid={`product-${product.id}`}>
      <div className="product-image-container">
        <img src={product.image_url} alt={product.title} className="product-image" />
      </div>
      <div className="product-details">
        <h3 className="product-title">{product.title}</h3>
        {product.description && (
          <p className="product-description">{product.description}</p>
        )}
        
        {product.has_variants && (
          <div className="variant-selector">
            <label htmlFor={`variant-${product.id}`}>Quantity:</label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariant?.id}
              onChange={(e) => {
                const variant = COASTER_VARIANTS.find(v => v.id === e.target.value);
                setSelectedVariant(variant);
              }}
              className="variant-dropdown"
              data-testid={`variant-select-${product.id}`}
            >
              {COASTER_VARIANTS.map(variant => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} — ${variant.price}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="product-price">
          ${currentPrice?.toFixed(2)}
        </div>

        <div className="special-instructions">
          <label htmlFor={`instructions-${product.id}`}>
            Special Instructions or Personal Note (optional)
          </label>
          <textarea
            id={`instructions-${product.id}`}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Gift message, special requests, etc."
            className="instructions-textarea"
            rows={3}
          />
        </div>

        <Button
          className="buy-now-btn"
          onClick={handleCheckout}
          disabled={isCheckingOut}
          data-testid={`buy-btn-${product.id}`}
        >
          <ShoppingCart size={18} />
          {isCheckingOut ? 'Processing...' : 'Buy Now'}
        </Button>
      </div>
    </div>
  );
}

function Muggs() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/muggs-products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="substack-site">
      {/* Header */}
      <header className="substack-header">
        <div className="header-logo">
          <Link to="/">
            <img 
              src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg" 
              alt="the OBX Beach Bum" 
              className="main-logo"
            />
          </Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className="nav-item">Home</Link>
          <div className="nav-dropdown">
            <span className="nav-item dropdown-trigger">Shop ▾</span>
            <div className="dropdown-menu">
              <Link to="/gallery" className="dropdown-item">Beach Bum Gallery</Link>
              <Link to="/shop/muggs" className="dropdown-item active">B.B. Muggs</Link>
              <Link to="/shop/tees" className="dropdown-item">Beach Bum Tees</Link>
              <Link to="/shop/notecards" className="dropdown-item">Notecards</Link>
            </div>
          </div>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="muggs-hero">
        <div className="hero-content">
          <img 
            src="https://customer-assets.emergentagent.com/job_381afaab-428f-429b-b443-99e1de976f4c/artifacts/lwdla9in_bbmuggs%20logo.png" 
            alt="B.B. Muggs - Distinctive Drinkware & Stuff" 
            className="shop-hero-logo"
            style={{ maxWidth: '280px', marginBottom: '20px' }}
          />
          <p className="hero-description">
            Life's too short for boring mugs. Coffee tastes better with a little salt air 
            and a proper mugg designed by the legendary OBX Beach Bum.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <main className="muggs-main">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Coffee size={64} style={{ color: '#ccc', marginBottom: '20px' }} />
            <h3 style={{ margin: '0 0 10px' }}>Coming Soon!</h3>
            <p style={{ color: '#666' }}>Our B.B. Muggs collection is being prepared. Check back soon!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="shipping-info">
          <p>🚚 Free shipping on orders over $50 • US shipping only</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="substack-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-logo">
              <img 
                src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/fndpshgx_whitelogo-obxbb.png" 
                alt="the OBX Beach Bum" 
              />
            </div>
            <nav className="footer-nav">
              <Link to="/about">About</Link>
              <Link to="/gallery">Gallery</Link>
              <Link to="/admin/login">Admin</Link>
            </nav>
          </div>
          <div className="footer-bottom">
            <p className="copyright">© {new Date().getFullYear()} the OBX Beach Bum</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Muggs;
