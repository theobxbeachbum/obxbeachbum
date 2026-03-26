import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Pricing variants for all notecards
const NOTECARD_VARIANTS = [
  { id: 'single', label: 'Single', price: 6 },
  { id: 'six-pak', label: 'Six-Pak', price: 30 },
  { id: 'ten-pak', label: 'Ten-Pak', price: 40 }
];

function NotecardCard({ notecard }) {
  const [selectedVariant, setSelectedVariant] = useState(NOTECARD_VARIANTS[0]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const orderData = {
        product_id: notecard.id,
        product_title: notecard.title,
        variant: selectedVariant.id,
        variant_label: selectedVariant.label,
        price: selectedVariant.price,
        special_instructions: specialInstructions || null,
        origin_url: window.location.origin
      };

      const response = await axios.post(`${BACKEND_URL}/api/notecards/checkout`, orderData);
      
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
    <div className="notecard-product-card" data-testid={`notecard-${notecard.id}`}>
      <div className="notecard-image-container">
        <img src={notecard.image_url} alt={notecard.title} className="notecard-image" />
      </div>
      <div className="notecard-details">
        <h3 className="notecard-title">{notecard.title}</h3>
        
        <div className="variant-selector">
          <label htmlFor={`variant-${notecard.id}`}>Quantity:</label>
          <select
            id={`variant-${notecard.id}`}
            value={selectedVariant.id}
            onChange={(e) => {
              const variant = NOTECARD_VARIANTS.find(v => v.id === e.target.value);
              setSelectedVariant(variant);
            }}
            className="variant-dropdown"
            data-testid={`variant-select-${notecard.id}`}
          >
            {NOTECARD_VARIANTS.map(variant => (
              <option key={variant.id} value={variant.id}>
                {variant.label} — ${variant.price}
              </option>
            ))}
          </select>
        </div>

        <div className="product-price">
          ${selectedVariant.price.toFixed(2)}
        </div>

        <div className="special-instructions">
          <label htmlFor={`instructions-${notecard.id}`}>
            Special Instructions or Personal Note (optional)
          </label>
          <textarea
            id={`instructions-${notecard.id}`}
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
          data-testid={`buy-btn-${notecard.id}`}
        >
          <ShoppingCart size={18} />
          {isCheckingOut ? 'Processing...' : 'Buy Now'}
        </Button>
      </div>
    </div>
  );
}

function Notecards() {
  const [notecards, setNotecards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotecards();
  }, []);

  const fetchNotecards = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/notecards-products`);
      setNotecards(response.data);
    } catch (error) {
      console.error('Failed to fetch notecards:', error);
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
              <Link to="/shop/muggs" className="dropdown-item">B.B. Muggs</Link>
              <Link to="/shop/tees" className="dropdown-item">Beach Bum Tees</Link>
              <Link to="/shop/notecards" className="dropdown-item active">Notecards</Link>
            </div>
          </div>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="notecards-hero" style={{ background: '#1a1a1a', padding: '50px 20px', textAlign: 'center' }}>
        <div className="hero-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <img 
            src="https://customer-assets.emergentagent.com/job_e79063ba-4cfe-4d19-91ab-648826687dcc/artifacts/ow79p8gd_mgnotecards.png"
            alt="Mostly Good Notecards by the Legendary OBX Beach Bum"
            style={{
              maxWidth: '350px',
              width: '80%',
              height: 'auto',
              marginBottom: '25px'
            }}
          />
          <p className="hero-description" style={{ color: '#ccc', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
            Send a piece of the OBX to someone special. Each 5x7 notecard features stunning 
            photography, is blank inside, individually wrapped, and includes an envelope.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <main className="notecards-main">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p>Loading notecards...</p>
          </div>
        ) : notecards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Mail size={64} style={{ color: '#ccc', marginBottom: '20px' }} />
            <h3 style={{ margin: '0 0 10px' }}>Coming Soon!</h3>
            <p style={{ color: '#666' }}>Our notecard collection is being prepared. Check back soon!</p>
          </div>
        ) : (
          <div className="notecards-grid">
            {notecards.map(notecard => (
              <NotecardCard key={notecard.id} notecard={notecard} />
            ))}
          </div>
        )}

        <div className="product-info-banner">
          <div className="info-item">
            <span className="info-icon">📐</span>
            <span>5x7 Size</span>
          </div>
          <div className="info-item">
            <span className="info-icon">✉️</span>
            <span>Envelope Included</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📦</span>
            <span>Individually Wrapped</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📝</span>
            <span>Blank Inside</span>
          </div>
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

export default Notecards;
