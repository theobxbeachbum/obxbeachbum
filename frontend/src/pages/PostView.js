import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail } from 'lucide-react';

function PostView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <h1>Daily OBX</h1>
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

          <div className="post-content" data-testid="post-content">
            {/* Display all images */}
            {post.image_url && (
              <img 
                src={post.image_url} 
                alt={post.title}
                className="post-image"
              />
            )}
            
            {post.image_urls && post.image_urls.length > 0 && post.image_urls.map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`${post.title} - Image ${index + 1}`}
                className="post-image"
              />
            ))}

            {/* Content */}
            <div className="post-body">
              {post.content.split('\n').map((paragraph, index) => (
                paragraph.trim() && <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Subscribe CTA */}
          <div className="subscribe-cta">
            <h3>Enjoy this story?</h3>
            <p>Subscribe to get OBX photography stories delivered to your inbox.</p>
            <Link to="/subscribe" className="btn btn-primary" data-testid="subscribe-cta-btn">
              Subscribe to Daily OBX
            </Link>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="public-footer">
        <div className="public-container">
          <div className="footer-content">
            <p>&copy; 2025 Daily OBX. All rights reserved.</p>
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