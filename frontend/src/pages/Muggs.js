import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Coffee, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Product data with placeholder images (to be replaced with actual product images)
const PRODUCTS = [
  {
    id: 'ceramic-mug-15oz',
    title: '15oz Ceramic Coffee Mugg',
    description: 'Start your morning right with our premium ceramic mug featuring stunning OBX photography.',
    price: 18,
    image: 'https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg',
    type: 'mug'
  },
  {
    id: 'tumbler-20oz',
    title: '20oz Stainless Steel Tumbler',
    description: 'Keep your drinks hot or cold with our durable stainless steel tumbler.',
    price: 28,
    image: 'https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg',
    type: 'tumbler'
  },
  {
    id: 'sippy-cup-12oz',
    title: '12oz Sippy Cup',
    description: 'Perfect for little beach bums! Spill-proof design with beach-themed artwork.',
    price: 20,
    image: 'https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg',
    type: 'sippy'
  },
  {
    id: 'ceramic-coaster',
    title: '4x4 Ceramic Coaster',
    description: 'Protect your surfaces in style with our ceramic coasters featuring OBX photography.',
    basePrice: 7,
    image: 'https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg',
    type: 'coaster',
    variants: [
      { id: 'single', label: 'Single', price: 7 },
      { id: 'set-2', label: 'Set of 2', price: 12 },
      { id: 'set-4', label: 'Set of 4', price: 21 }
    ]
  }
];

function ProductCard({ product, onCheckout }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants ? product.variants[0] : null
  );
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const currentPrice = product.variants 
    ? selectedVariant?.price 
    : product.price;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const orderData = {
        product_id: product.id,
        product_title: product.title,
        product_type: product.type,
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
        <img src={product.image} alt={product.title} className="product-image" />
      </div>
      <div className="product-details">
        <h3 className="product-title">{product.title}</h3>
        <p className="product-description">{product.description}</p>
        
        {product.variants && (
          <div className="variant-selector">
            <label htmlFor={`variant-${product.id}`}>Quantity:</label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariant?.id}
              onChange={(e) => {
                const variant = product.variants.find(v => v.id === e.target.value);
                setSelectedVariant(variant);
              }}
              className="variant-dropdown"
              data-testid={`variant-select-${product.id}`}
            >
              {product.variants.map(variant => (
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
          <Coffee size={48} className="hero-icon" />
          <h1>B.B. Muggs</h1>
          <p className="hero-subtitle">Beach Bum Drinkware Collection</p>
          <p className="hero-description">
            Start your morning with a sunrise coffee in style. Our collection of beach-themed 
            mugs and drinkware features stunning OBX photography.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <main className="muggs-main">
        <div className="products-grid">
          {PRODUCTS.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

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
