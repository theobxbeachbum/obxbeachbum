import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Gallery() {
  const [searchParams] = useSearchParams();
  const [prints, setPrints] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState({});
  const [typeNames, setTypeNames] = useState({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('tag') || '');
  const [selectedPrint, setSelectedPrint] = useState(null);
  const [selectedType, setSelectedType] = useState('paper');
  const [selectedSize, setSelectedSize] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchGallery();
    fetchPricing();
    fetchTags();
  }, []);

  useEffect(() => {
    // If coming from a post with a specific print, scroll to it
    const printId = searchParams.get('print');
    if (printId && prints.length > 0) {
      const element = document.getElementById(`print-${printId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setSelectedPrint(prints.find(p => p.id === printId));
      }
    }
  }, [searchParams, prints]);

  const fetchGallery = async () => {
    try {
      const tag = searchParams.get('tag') || '';
      const response = await axios.get(`${BACKEND_URL}/api/public/gallery${tag ? `?tag=${tag}` : ''}`);
      setPrints(response.data);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/prints/pricing`);
      setPricing(response.data.pricing);
      setTypeNames(response.data.type_names);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/public/gallery/tags`);
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('tag', searchQuery);
    window.history.replaceState({}, '', `/gallery${searchQuery ? `?tag=${searchQuery}` : ''}`);
    fetchGallery();
  };

  const clearSearch = () => {
    setSearchQuery('');
    window.history.replaceState({}, '', '/gallery');
    fetchGallery();
  };

  const openPrintModal = (print) => {
    setSelectedPrint(print);
    const availableTypes = print.available_types || ['paper', 'canvas', 'metal'];
    setSelectedType(availableTypes[0]);
    if (pricing[availableTypes[0]]) {
      setSelectedSize(Object.keys(pricing[availableTypes[0]])[0]);
    }
    setSpecialInstructions('');
  };

  const closePrintModal = () => {
    setSelectedPrint(null);
    setSpecialInstructions('');
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    if (pricing[type]) {
      setSelectedSize(Object.keys(pricing[type])[0]);
    }
  };

  const getPrice = () => {
    if (pricing[selectedType] && pricing[selectedType][selectedSize]) {
      return pricing[selectedType][selectedSize];
    }
    return 0;
  };

  const handleCheckout = async () => {
    if (!selectedPrint || !selectedType || !selectedSize) {
      toast.error('Please select print options');
      return;
    }

    setCheckingOut(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/prints/checkout`, {
        print_id: selectedPrint.id,
        print_title: selectedPrint.title,
        print_type: selectedType,
        size: selectedSize,
        price: getPrice(),
        special_instructions: specialInstructions || null,
        origin_url: window.location.origin,
        source: selectedPrint.source || 'gallery'
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Checkout failed');
      setCheckingOut(false);
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
              <Link to="/gallery" className="dropdown-item active">Beach Bum Gallery</Link>
              <Link to="/shop/muggs" className="dropdown-item">B.B. Muggs</Link>
              <Link to="/shop/tees" className="dropdown-item">Beach Bum Tees</Link>
              <Link to="/shop/notecards" className="dropdown-item">Notecards</Link>
            </div>
          </div>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Gallery Hero */}
      <section className="gallery-hero">
        <h1>Beach Bum Gallery</h1>
        <p>Fine art prints of stunning OBX photography</p>
      </section>

      {/* Search/Filter */}
      <div className="gallery-filter">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by keyword (e.g., sunrise, lighthouse, pelican)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="clear-search">
                <X size={18} />
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
        
        {tags.length > 0 && (
          <div className="tag-filters">
            {tags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => { setSearchQuery(tag); }}
                className={`tag-pill ${searchQuery === tag ? 'active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <main className="gallery-main">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : prints.length === 0 ? (
          <div className="empty-gallery">
            <h3>No prints found</h3>
            <p>Try a different search term or check back soon for new additions.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {prints.map((print) => (
              <div 
                key={print.id} 
                id={`print-${print.id}`}
                className={`gallery-item ${print.featured ? 'featured' : ''}`}
                onClick={() => openPrintModal(print)}
              >
                {print.featured && <span className="featured-badge">★ Featured</span>}
                <img src={print.image_url} alt={print.title} />
                <div className="gallery-item-info">
                  <h3>{print.title}</h3>
                  {print.description && <p>{print.description}</p>}
                  <span className="buy-prompt">Click to buy print →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Print Modal - rendered via portal to document.body */}
      {selectedPrint && createPortal(
        <div 
          className="print-modal-overlay" 
          onClick={closePrintModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div className="print-modal" onClick={e => e.stopPropagation()} style={{
            background: '#fff',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '1000px',
            height: '600px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <button className="modal-close" onClick={closePrintModal}>
              <X size={24} />
            </button>
            
            <div className="modal-content" style={{
              display: 'flex',
              flexDirection: 'row',
              height: '100%'
            }}>
              <div className="modal-image" style={{
                flex: '0 0 50%',
                width: '50%',
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}>
                <img src={selectedPrint.image_url} alt={selectedPrint.title} style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }} />
              </div>
              
              <div className="modal-details" style={{
                flex: '0 0 50%',
                width: '50%',
                padding: '30px',
                background: '#fff',
                overflowY: 'auto',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}>
                <h2>{selectedPrint.title}</h2>
                {selectedPrint.description && (
                  <p className="print-description">{selectedPrint.description}</p>
                )}
                
                {/* Print Type Selector */}
                <div className="option-group">
                  <label style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Print Type</label>
                  <div className="type-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {(selectedPrint.available_types || ['paper', 'canvas', 'metal']).map(type => (
                      <button
                        key={type}
                        className={`type-btn ${selectedType === type ? 'active' : ''}`}
                        onClick={() => handleTypeChange(type)}
                        style={{
                          padding: '12px 20px',
                          border: '2px solid',
                          borderColor: selectedType === type ? '#1a1a1a' : '#ddd',
                          background: selectedType === type ? '#1a1a1a' : '#fff',
                          color: selectedType === type ? '#fff' : '#333',
                          borderRadius: '8px',
                          fontSize: '16px',
                          cursor: 'pointer'
                        }}
                      >
                        {typeNames[type] || type}
                      </button>
                    ))}
                    <button 
                      className="type-btn disabled" 
                      disabled
                      style={{
                        padding: '12px 20px',
                        border: '2px solid #eee',
                        background: '#f5f5f5',
                        color: '#999',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'not-allowed'
                      }}
                    >
                      Framed Prints - Coming Soon
                    </button>
                  </div>
                </div>

                {/* Size Selector */}
                <div className="option-group">
                  <label>Size</label>
                  <div className="size-grid">
                    {pricing[selectedType] && Object.entries(pricing[selectedType]).map(([size, price]) => (
                      <button
                        key={size}
                        className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span className="size-label">{size}</span>
                        <span className="size-price">${price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="option-group">
                  <label>Special Instructions or Personal Note (optional)</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Gift message, special requests, etc."
                    rows={3}
                  />
                </div>

                {/* Price & Checkout */}
                <div className="checkout-section">
                  <div className="price-display">
                    <span className="price-label">Total:</span>
                    <span className="price-amount">${getPrice()}</span>
                  </div>
                  <Button 
                    className="checkout-btn"
                    onClick={handleCheckout}
                    disabled={checkingOut || !selectedSize}
                  >
                    <ShoppingCart size={20} />
                    {checkingOut ? 'Processing...' : 'Buy Print'}
                  </Button>
                </div>

                <p className="shipping-note">
                  Shipping calculated at checkout. US shipping only.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
              <Link to="/archive">Archive</Link>
              <Link to="/add-to-homescreen">Add to Home Screen</Link>
              <Link to="/admin/login">Admin</Link>
            </nav>
          </div>
          <div className="footer-bottom">
            <p className="copyright">© {new Date().getFullYear()} the OBX Beach Bum</p>
            <div className="footer-legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Gallery;
