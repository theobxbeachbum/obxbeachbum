import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Separate logo and background images
const HERO_BG = 'https://customer-assets.emergentagent.com/job_e79063ba-4cfe-4d19-91ab-648826687dcc/artifacts/idywq15b_bbteesbg.png';
const LOGO = 'https://customer-assets.emergentagent.com/job_e79063ba-4cfe-4d19-91ab-648826687dcc/artifacts/s18uwkdg_bbtees.png';

function Tees() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/tees`);
      setProducts(response.data.filter(p => p.active));
    } catch (error) {
      // No products yet, that's okay
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (product, selectedVariant) => {
    setCheckoutLoading(prev => ({ ...prev, [product.id]: true }));
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/tees/create-checkout-session`, {
        product_id: product.id,
        variant: selectedVariant,
        origin_url: window.location.origin
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(prev => ({ ...prev, [product.id]: false }));
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
              <Link to="/shop/tees" className="dropdown-item active">Beach Bum Tees</Link>
              <Link to="/shop/notecards" className="dropdown-item">Notecards</Link>
            </div>
          </div>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Hero Section with Background Image and Logo Overlay */}
      <section 
        className="tees-hero"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '450px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {/* Logo Overlay */}
        <img 
          src={LOGO} 
          alt="Beach Bum Tees & Stuff"
          className="tees-logo"
          style={{
            maxWidth: '500px',
            width: '80%',
            height: 'auto',
            position: 'relative',
            zIndex: 2
          }}
        />
      </section>

      {/* Main Content */}
      <main className="tees-main" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '40px 20px 60px' 
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="loading-spinner" />
          </div>
        ) : products.length === 0 ? (
          /* Coming Soon State */
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '12px 40px',
              borderRadius: '25px',
              fontSize: '20px',
              fontWeight: '600',
              display: 'inline-block',
              marginBottom: '30px'
            }}>
              Coming Soon
            </div>
            
            <p style={{ 
              fontSize: '18px', 
              color: '#666', 
              maxWidth: '500px', 
              margin: '0 auto 30px',
              lineHeight: '1.6'
            }}>
              Our collection of beach-inspired apparel is on its way. 
              Subscribe to be notified when we launch!
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link 
                to="/subscribe" 
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  background: '#1a1a1a',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Subscribe for Updates
              </Link>
              <Link 
                to="/gallery" 
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  background: '#fff',
                  color: '#1a1a1a',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  border: '2px solid #1a1a1a'
                }}
              >
                Browse Gallery
              </Link>
            </div>
          </div>
        ) : (
          /* Products Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '30px'
          }}>
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onCheckout={handleCheckout}
                loading={checkoutLoading[product.id]}
              />
            ))}
          </div>
        )}
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

      {/* Responsive Styles */}
      <style>{`
        .tees-hero {
          min-height: 450px;
        }
        
        .tees-logo {
          max-width: 500px;
          width: 80%;
        }
        
        @media (max-width: 768px) {
          .tees-hero {
            min-height: 350px;
          }
          .tees-logo {
            max-width: 320px;
            width: 85%;
          }
        }
        
        @media (max-width: 480px) {
          .tees-hero {
            min-height: 280px;
          }
          .tees-logo {
            max-width: 260px;
            width: 90%;
          }
        }
      `}</style>
    </div>
  );
}

// Product Card Component (for future use when products are added)
function ProductCard({ product, onCheckout, loading }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.[0] || { name: 'Default', price: product.price || 25 }
  );

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'box-shadow 0.3s'
    }}>
      {/* Product Image */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        overflow: 'hidden',
        background: '#f8f9fa'
      }}>
        <img 
          src={product.image_url} 
          alt={product.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>
      
      {/* Product Details */}
      <div style={{ padding: '20px' }}>
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '20px',
          margin: '0 0 10px',
          color: '#1a1a1a'
        }}>
          {product.title}
        </h3>
        
        {product.description && (
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: '0 0 15px',
            lineHeight: '1.5'
          }}>
            {product.description}
          </p>
        )}
        
        {/* Variant Selector */}
        {product.variants && product.variants.length > 1 && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              Size / Style
            </label>
            <select
              value={selectedVariant.name}
              onChange={(e) => {
                const variant = product.variants.find(v => v.name === e.target.value);
                setSelectedVariant(variant);
              }}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px'
              }}
            >
              {product.variants.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} - ${v.price}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Price */}
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '15px'
        }}>
          ${selectedVariant.price}
        </div>
        
        {/* Buy Button */}
        <Button
          onClick={() => onCheckout(product, selectedVariant)}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          data-testid={`buy-${product.id}`}
        >
          <ShoppingBag size={18} />
          {loading ? 'Processing...' : 'Buy Now'}
        </Button>
      </div>
    </div>
  );
}

export default Tees;
