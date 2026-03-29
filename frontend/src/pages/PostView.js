import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function PostView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState({});

  useEffect(() => {
    fetchPost();
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleBuyPrint = async (imageUrl, imageTitle) => {
    const imageKey = imageUrl;
    setCheckoutLoading(prev => ({ ...prev, [imageKey]: true }));
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/prints/checkout`, {
        print_id: `post-${post.id}-${Date.now()}`,
        print_title: imageTitle || post.title,
        print_type: 'paper',
        size: '5x7',
        price: 25,
        image_url: imageUrl,
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
      setCheckoutLoading(prev => ({ ...prev, [imageKey]: false }));
    }
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
                  onClick={() => handleBuyPrint(post.image_url, post.title)}
                  disabled={checkoutLoading[post.image_url]}
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
                    cursor: checkoutLoading[post.image_url] ? 'not-allowed' : 'pointer',
                    opacity: checkoutLoading[post.image_url] ? 0.7 : 1
                  }}
                  data-testid="buy-featured-print"
                >
                  <ShoppingBag size={18} />
                  {checkoutLoading[post.image_url] ? 'Loading...' : 'Buy This Print'}
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
                      onClick={() => handleBuyPrint(imgUrl, `${post.title} - Image ${index + 1}`)}
                      disabled={checkoutLoading[imgUrl]}
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
                        cursor: checkoutLoading[imgUrl] ? 'not-allowed' : 'pointer',
                        opacity: checkoutLoading[imgUrl] ? 0.7 : 1
                      }}
                      data-testid={`buy-print-${index}`}
                    >
                      <ShoppingBag size={18} />
                      {checkoutLoading[imgUrl] ? 'Loading...' : 'Buy This Print'}
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
    </div>
  );
}

export default PostView;