import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function PostView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState('');
  const [selectedType, setSelectedType] = useState('paper');
  const [selectedSize, setSelectedSize] = useState('');
  const [pricing, setPricing] = useState({});
  const [typeNames, setTypeNames] = useState({});

  useEffect(() => {
    fetchPost();
    fetchPricing();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`/public/posts/${slug}`);
      setPost(response.data);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      setError('Post not found');
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const openPrintModal = (imageUrl, imageTitle) => {
    setSelectedImage(imageUrl);
    setSelectedImageTitle(imageTitle);
    setSelectedType('paper');
    setSelectedSize('');
    setShowPrintModal(true);
  };

  const handleCheckout = async () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    
    setCheckoutLoading(true);
    
    try {
      const price = pricing[selectedType]?.[selectedSize];
      const response = await axios.post(`${BACKEND_URL}/api/prints/checkout`, {
        print_id: `post-${post.id}-${Date.now()}`,
        print_title: selectedImageTitle || post.title,
        print_type: selectedType,
        size: selectedSize,
        price: price,
        image_url: selectedImage,
        origin_url: window.location.origin,
        source: 'post'
      });
      
      const checkoutUrl = response.data.checkout_url || response.data.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Failed to get checkout URL');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
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

  if (loading) {
    return (
      <div className="public-site">
        <div className="loading-spinner" style={{ margin: '100px auto' }}></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="public-site">
        <div className="public-container" style={{ padding: '100px 20px', textAlign: 'center' }}>
          <h2>Post Not Found</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>The post you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="public-site">
      {/* Header */}
      <header className="public-header">
        <div className="public-container">
          <Link to="/" className="site-logo">
            <img src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg" alt="the OBX Beach Bum" className="logo-image" />
          </Link>
          <nav className="public-nav">
            <Link to="/" className="nav-link">Stories</Link>
            <Link to="/subscribe" className="nav-link">
              <Mail className="w-4 h-4" style={{ display: 'inline', marginRight: '6px' }} />
              Subscribe
            </Link>
          </nav>
        </div>
      </header>

      {/* Post Content */}
      <article className="post-view">
        <div className="post-view-container">
          <button 
            onClick={() => navigate(-1)} 
            className="back-button"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <header className="post-header">
            <h1 className="post-title" data-testid="post-title">{post.title}</h1>
            <time className="post-date" data-testid="post-date">
              {formatDate(post.published_at)}
            </time>
          </header>

          {/* Featured Image */}
          {post.image_url && (
            <div className="post-featured-image">
              <img src={post.image_url} alt={post.title} />
              {post.available_for_purchase && (
                <button 
                  onClick={() => openPrintModal(post.image_url, post.title)}
                  className="buy-print-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '15px',
                    padding: '12px 24px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  data-testid="buy-featured-print"
                >
                  <ShoppingBag size={18} />
                  Buy This Print
                </button>
              )}
            </div>
          )}

          {/* Additional Images */}
          {post.image_urls && post.image_urls.length > 0 && (
            <div className="post-additional-images" style={{ marginTop: '30px' }}>
              {post.image_urls.map((imgUrl, index) => (
                <div key={index} className="post-image-item" style={{ marginBottom: '30px' }}>
                  <img 
                    src={imgUrl} 
                    alt={`${post.title} - Image ${index + 1}`}
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                  {post.available_for_purchase && (
                    <button 
                      onClick={() => openPrintModal(imgUrl, `${post.title} - Image ${index + 1}`)}
                      className="buy-print-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '15px',
                        padding: '12px 24px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      data-testid={`buy-print-${index}`}
                    >
                      <ShoppingBag size={18} />
                      Buy This Print
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="post-content" data-testid="post-content">
            {/* Content is HTML from rich text editor */}
            <div 
              className="post-body rich-text-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* Subscribe CTA */}
          <div className="subscribe-cta">
            <h3>Enjoy this story?</h3>
            <p>Subscribe to get OBX photography stories delivered to your inbox.</p>
            <Link to="/subscribe" className="btn btn-primary" data-testid="subscribe-cta-btn">
              Subscribe to the OBX Beach Bum
            </Link>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="public-footer">
        <div className="public-container">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} the OBX Beach Bum. All rights reserved.</p>
            <div className="footer-links">
              <Link to="/subscribe">Subscribe</Link>
              <Link to="/support">Support</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Print Selection Modal */}
      {showPrintModal && (
        <div 
          className="print-modal-overlay" 
          onClick={() => setShowPrintModal(false)}
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
          data-testid="print-modal-overlay"
        >
          <div 
            className="print-modal" 
            onClick={e => e.stopPropagation()} 
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '95%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }}
            data-testid="print-modal"
          >
            <button 
              className="modal-close" 
              onClick={() => setShowPrintModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
              data-testid="close-modal-btn"
            >
              <X size={24} />
            </button>
            
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              height: '100%',
              minHeight: '500px'
            }}>
              {/* Image Preview */}
              <div style={{
                flex: '0 0 50%',
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box'
              }}>
                <img 
                  src={selectedImage} 
                  alt={selectedImageTitle} 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '450px',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                  data-testid="modal-image"
                />
              </div>
              
              {/* Options Panel */}
              <div style={{
                flex: '0 0 50%',
                padding: '30px',
                background: '#fff',
                overflowY: 'auto'
              }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '24px',
                  marginBottom: '8px'
                }}>{selectedImageTitle}</h2>
                <p style={{ color: '#666', marginBottom: '24px' }}>Select your print options below</p>
                
                {/* Print Type Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '12px', 
                    display: 'block' 
                  }}>Print Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['paper', 'canvas', 'metal'].map(type => (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type)}
                        style={{
                          padding: '12px 20px',
                          border: '2px solid',
                          borderColor: selectedType === type ? '#1a1a1a' : '#ddd',
                          background: selectedType === type ? '#1a1a1a' : '#fff',
                          color: selectedType === type ? '#fff' : '#333',
                          borderRadius: '8px',
                          fontSize: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        data-testid={`type-${type}`}
                      >
                        {typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '12px', 
                    display: 'block' 
                  }}>Size</label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '10px' 
                  }}>
                    {pricing[selectedType] && Object.entries(pricing[selectedType]).map(([size, price]) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          padding: '14px',
                          border: '2px solid',
                          borderColor: selectedSize === size ? '#1a1a1a' : '#ddd',
                          background: selectedSize === size ? '#1a1a1a' : '#fff',
                          color: selectedSize === size ? '#fff' : '#333',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                        data-testid={`size-${size.replace(/\s+/g, '-')}`}
                      >
                        <span style={{ display: 'block', fontWeight: '600', fontSize: '15px' }}>{size}</span>
                        <span style={{ display: 'block', fontSize: '14px', marginTop: '4px', opacity: 0.8 }}>${price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price & Checkout */}
                <div style={{
                  borderTop: '1px solid #eee',
                  paddingTop: '20px',
                  marginTop: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '16px', color: '#666' }}>Total:</span>
                    <span style={{ fontSize: '28px', fontWeight: '700' }}>${getPrice()}</span>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    disabled={checkoutLoading || !selectedSize}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: checkoutLoading || !selectedSize ? 'not-allowed' : 'pointer',
                      opacity: checkoutLoading || !selectedSize ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    data-testid="checkout-btn"
                  >
                    <ShoppingBag size={20} />
                    {checkoutLoading ? 'Processing...' : 'Buy Print'}
                  </Button>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: '#999',
                  textAlign: 'center',
                  marginTop: '16px'
                }}>
                  Shipping calculated at checkout. US shipping only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostView;