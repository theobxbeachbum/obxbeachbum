import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, X, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Quick Buy Card Component with hover popup
function PrintCard({ print, pricing, typeNames, onOpenFullModal, onQuickCheckout }) {
  const [showQuickBuy, setShowQuickBuy] = useState(false);
  const [quickType, setQuickType] = useState('paper');
  const [quickSize, setQuickSize] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const cardRef = useRef(null);
  const timeoutRef = useRef(null);

  // Popular sizes for quick buy (subset of full options)
  const getQuickSizes = (type) => {
    if (!pricing[type]) return [];
    const allSizes = Object.entries(pricing[type]);
    // Show first 3 most affordable sizes for quick selection
    return allSizes.slice(0, 3);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowQuickBuy(true);
      // Auto-select first size when popup appears
      if (pricing[quickType]) {
        setQuickSize(Object.keys(pricing[quickType])[0]);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowQuickBuy(false);
    }, 200);
  };

  const handleQuickTypeChange = (type) => {
    setQuickType(type);
    if (pricing[type]) {
      setQuickSize(Object.keys(pricing[type])[0]);
    }
  };

  const handleQuickBuy = async (e) => {
    e.stopPropagation();
    if (!quickSize) return;
    
    setIsCheckingOut(true);
    try {
      await onQuickCheckout(print, quickType, quickSize, pricing[quickType][quickSize]);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const quickSizes = getQuickSizes(quickType);
  const currentPrice = pricing[quickType]?.[quickSize] || 0;

  return (
    <div 
      ref={cardRef}
      id={`print-${print.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: '#fff',
        borderRadius: '8px',
        overflow: 'visible',
        boxShadow: showQuickBuy ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: showQuickBuy ? 'translateY(-4px)' : 'none',
        zIndex: showQuickBuy ? 10 : 1
      }}
      data-testid={`print-card-${print.id}`}
    >
      {/* Featured Badge */}
      {print.featured && (
        <span style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: '#ffd700',
          color: '#333',
          padding: '3px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: '600',
          zIndex: 2
        }}>★ Featured</span>
      )}
      
      {/* Image - clicks open full modal */}
      <div onClick={() => onOpenFullModal(print)}>
        <img 
          src={print.image_url} 
          alt={print.title} 
          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', borderRadius: '8px 8px 0 0' }}
        />
      </div>
      
      {/* Title bar */}
      <div 
        onClick={() => onOpenFullModal(print)}
        style={{ padding: '10px 12px', borderBottom: showQuickBuy ? '1px solid #eee' : 'none' }}
      >
        <h3 style={{ 
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '14px',
          margin: '0 0 4px',
          color: '#1a1a1a',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>{print.title}</h3>
        <span style={{ fontSize: '11px', color: '#888' }}>
          {showQuickBuy ? 'Quick buy below ↓' : 'Hover for quick buy'}
        </span>
      </div>

      {/* Quick Buy Popup */}
      {showQuickBuy && (
        <div 
          style={{
            padding: '12px',
            background: '#fff',
            borderRadius: '0 0 8px 8px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
          data-testid="quick-buy-popup"
        >
          {/* Quick Type Selector */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>Type</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['paper', 'canvas', 'metal'].map(type => (
                <button
                  key={type}
                  onClick={() => handleQuickTypeChange(type)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    fontWeight: '500',
                    border: '1px solid',
                    borderColor: quickType === type ? '#1a1a1a' : '#ddd',
                    background: quickType === type ? '#1a1a1a' : '#fff',
                    color: quickType === type ? '#fff' : '#666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  data-testid={`quick-type-${type}`}
                >
                  {type === 'paper' ? 'Paper' : type === 'canvas' ? 'Canvas' : 'Metal'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Size Selector */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>Size</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {quickSizes.map(([size, price]) => (
                <button
                  key={size}
                  onClick={() => setQuickSize(size)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    border: '1px solid',
                    borderColor: quickSize === size ? '#1a1a1a' : '#ddd',
                    background: quickSize === size ? '#1a1a1a' : '#fff',
                    color: quickSize === size ? '#fff' : '#666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s'
                  }}
                  data-testid={`quick-size-${size}`}
                >
                  <div style={{ fontWeight: '600' }}>{size}</div>
                  <div style={{ opacity: 0.8 }}>${price}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => onOpenFullModal(print)}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '4px',
                fontSize: '10px',
                color: '#666',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              More sizes →
            </button>
          </div>

          {/* Quick Buy Button */}
          <button
            onClick={handleQuickBuy}
            disabled={isCheckingOut || !quickSize}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '600',
              background: isCheckingOut ? '#666' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isCheckingOut ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
            data-testid="quick-buy-btn"
          >
            <Zap size={14} />
            {isCheckingOut ? 'Processing...' : `Quick Buy · $${currentPrice}`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Category display order
const CATEGORY_ORDER = [
  'Featured Images',
  'Best Selling',
  'Beachscapes',
  'OBX Sunrises',
  'Waves',
  'Shorebirds',
  'Pelicans',
  'Ripples',
  'Seaoats',
  'Dodging Shadows'
];

function Gallery() {
  const [searchParams] = useSearchParams();
  const [prints, setPrints] = useState([]);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState({});
  const [typeNames, setTypeNames] = useState({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('tag') || '');
  const [selectedPrint, setSelectedPrint] = useState(null);
  const [selectedType, setSelectedType] = useState('paper');
  const [selectedSize, setSelectedSize] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewedPrints');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(parsed);
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
  }, []);

  // Helper to add a print to recently viewed
  const addToRecentlyViewed = (print) => {
    const MAX_RECENT = 6;
    setRecentlyViewed(prev => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter(p => p.id !== print.id);
      // Add to front, limit to MAX_RECENT
      const updated = [
        { id: print.id, title: print.title, image_url: print.image_url },
        ...filtered
      ].slice(0, MAX_RECENT);
      // Save to localStorage
      localStorage.setItem('recentlyViewedPrints', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    fetchGallery();
    fetchPricing();
    fetchTags();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/public/gallery/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Group prints by category
  const groupedPrints = () => {
    const groups = {};
    
    prints.forEach(print => {
      // Posts go under "Featured Images"
      const category = print.source === 'post' ? 'Featured Images' : (print.category || 'Uncategorized');
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(print);
    });
    
    // Sort categories by predefined order
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return { groups, sortedCategories };
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
    // Track in recently viewed
    addToRecentlyViewed(print);
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

  // Quick checkout handler for hover popup
  const handleQuickCheckout = async (print, printType, size, price) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/prints/checkout`, {
        print_id: print.id,
        print_title: print.title,
        print_type: printType,
        size: size,
        price: price,
        special_instructions: null,
        origin_url: window.location.origin,
        source: print.source || 'gallery'
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Quick checkout failed');
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
      <section className="gallery-hero" style={{ textAlign: 'center', padding: '60px 20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img 
          src="https://customer-assets.emergentagent.com/job_381afaab-428f-429b-b443-99e1de976f4c/artifacts/hdwrm88d_Beach%20Bum%20Gallery.png" 
          alt="Beach Bum Gallery - Mostly Good Beach Photography" 
          className="shop-hero-logo"
          style={{ maxWidth: '320px', marginBottom: '15px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        />
        <p style={{ fontSize: '18px', color: '#666', margin: 0, textAlign: 'center' }}>Fine art prints of stunning OBX photography</p>
      </section>

      {/* Search/Filter */}
      <div className="gallery-filter" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', textAlign: 'center' }}>
        <form onSubmit={handleSearch} className="search-form" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search prints..."
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
          <div className="tag-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
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

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && !loading && (
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '20px 20px 0',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            border: '1px solid #eee'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>◷</span>
                Recently Viewed
              </h3>
              <button
                onClick={() => {
                  localStorage.removeItem('recentlyViewedPrints');
                  setRecentlyViewed([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                data-testid="clear-recent-btn"
              >
                Clear
              </button>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '8px'
            }}>
              {recentlyViewed.map((item) => {
                // Find full print data if available
                const fullPrint = prints.find(p => p.id === item.id) || item;
                return (
                  <div
                    key={item.id}
                    onClick={() => openPrintModal(fullPrint)}
                    style={{
                      flex: '0 0 auto',
                      width: '140px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    data-testid={`recent-item-${item.id}`}
                  >
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '90px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#1a1a1a',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{item.title}</p>
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#666' 
                      }}>View again →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <main className="gallery-main" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {loading ? (
          <div className="loading-spinner"></div>
        ) : prints.length === 0 ? (
          <div className="empty-gallery">
            <h3>No prints found</h3>
            <p>Try a different search term or check back soon for new additions.</p>
          </div>
        ) : (
          <div>
            {(() => {
              const { groups, sortedCategories } = groupedPrints();
              return sortedCategories.map(category => (
                <div key={category} style={{ marginBottom: '50px' }}>
                  <h2 style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '28px',
                    fontWeight: '600',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #e0e0e0',
                    color: '#1a1a1a'
                  }}>
                    {category}
                  </h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, 1fr)', 
                    gap: '16px',
                    width: '100%'
                  }}>
                    {groups[category].map((print) => (
                      <PrintCard
                        key={print.id}
                        print={print}
                        pricing={pricing}
                        typeNames={typeNames}
                        onOpenFullModal={openPrintModal}
                        onQuickCheckout={handleQuickCheckout}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()}
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
                  <label style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Size</label>
                  <div className="size-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {pricing[selectedType] && Object.entries(pricing[selectedType]).map(([size, price]) => (
                      <button
                        key={size}
                        className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          padding: '14px',
                          border: '2px solid',
                          borderColor: selectedSize === size ? '#1a1a1a' : '#ddd',
                          background: selectedSize === size ? '#1a1a1a' : '#fff',
                          color: selectedSize === size ? '#fff' : '#333',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <span style={{ display: 'block', fontWeight: '600', fontSize: '16px' }}>{size}</span>
                        <span style={{ display: 'block', fontSize: '15px', marginTop: '4px', opacity: 0.8 }}>${price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="option-group">
                  <label style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Special Instructions or Personal Note (optional)</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Gift message, special requests, etc."
                    rows={3}
                    style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical' }}
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
