import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function PublicHome() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/public/posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).toUpperCase();
  };

  const stripMarkdown = (content) => {
    let text = content.replace(/!\[.*?\]\(.*?\)/g, '');
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    text = text.replace(/\*\*?(.*?)\*\*?/g, '$1');
    text = text.replace(/__?(.*?)__?/g, '$1');
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/^-{3,}$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  };

  const getExcerpt = (content, length = 120) => {
    const plainText = stripMarkdown(content);
    if (plainText.length <= length) return plainText;
    return plainText.substring(0, length).trim() + '...';
  };

  const getMainImage = (post) => {
    if (post.image_urls && post.image_urls.length > 0) {
      return post.image_urls[0];
    }
    return post.image_url;
  };

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="substack-site">
      {/* Header */}
      <header className="substack-header">
        <div className="header-logo">
          <Link to="/">
            <img 
              src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg" 
              alt="Beach Bum Chronicles" 
              className="main-logo"
            />
          </Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className="nav-item active">Home</Link>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Hero Section */}
      {featuredPost && (
        <section className="substack-hero">
          <div className="hero-container">
            <Link to={`/post/${featuredPost.slug}`} className="hero-image-link">
              <div className="hero-featured-image">
                {getMainImage(featuredPost) ? (
                  <img src={getMainImage(featuredPost)} alt={featuredPost.title} />
                ) : (
                  <div className="hero-placeholder">
                    <span>Featured Image</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="hero-info">
              <Link to={`/post/${featuredPost.slug}`} className="hero-title-link">
                <h1 className="hero-post-title">{featuredPost.title}</h1>
              </Link>
              <p className="hero-excerpt">{getExcerpt(featuredPost.content, 150)}</p>
              <div className="hero-meta">
                <span className="hero-date">{formatDate(featuredPost.published_at)}</span>
                <span className="hero-separator">|</span>
                <span className="hero-author">the OBX BEACH BUM</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="substack-main">
        <div className="main-container">
          {/* Tabs */}
          <div className="content-tabs">
            <button 
              className={`tab-btn ${activeTab === 'latest' ? 'active' : ''}`}
              onClick={() => setActiveTab('latest')}
            >
              Latest
            </button>
            <button 
              className={`tab-btn ${activeTab === 'top' ? 'active' : ''}`}
              onClick={() => setActiveTab('top')}
            >
              Top
            </button>
            <button 
              className={`tab-btn ${activeTab === 'discussions' ? 'active' : ''}`}
              onClick={() => setActiveTab('discussions')}
            >
              Discussions
            </button>
          </div>

          <div className="content-layout">
            {/* Posts List */}
            <div className="posts-list">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : otherPosts.length === 0 ? (
                <div className="empty-state">
                  <p>More posts coming soon...</p>
                </div>
              ) : (
                otherPosts.map((post) => (
                  <article key={post.id} className="post-item">
                    <div className="post-item-content">
                      <Link to={`/post/${post.slug}`} className="post-item-title-link">
                        <h3 className="post-item-title">{post.title}</h3>
                      </Link>
                      <p className="post-item-subtitle">{getExcerpt(post.content, 80)}</p>
                      <div className="post-item-meta">
                        <span className="post-item-date">{formatDate(post.published_at)}</span>
                        <span className="post-item-author">the OBX BEACH BUM</span>
                      </div>
                    </div>
                    {getMainImage(post) && (
                      <Link to={`/post/${post.slug}`} className="post-item-image-link">
                        <img 
                          src={getMainImage(post)} 
                          alt={post.title}
                          className="post-item-image"
                        />
                      </Link>
                    )}
                  </article>
                ))
              )}

              {otherPosts.length > 0 && (
                <Link to="/archive" className="see-all-btn">
                  See All →
                </Link>
              )}
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-card">
                <h3 className="sidebar-title">the OBX Beach Bum</h3>
                <p className="sidebar-description">
                  I wander around the Outer Banks with my girlfriend and pair of cameras to photograph some of the most beautiful and stunning beachscapes and scenery anywhere. I'll share my photos, inspirational beach bum philosophy, location guides, and maybe even tutorials on how to get the most from your photography.
                </p>
                <div className="sidebar-subscription">
                  <p className="subscription-text">
                    the OBX Beach Bum is a reader-supported publication. To receive new posts and support my work, consider becoming a free or paid subscriber.
                  </p>
                  <Link to="/subscribe" className="sidebar-subscribe-btn">
                    Subscribe
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="substack-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-logo">
              <img 
                src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg" 
                alt="Beach Bum Chronicles" 
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
            <p className="copyright">© {new Date().getFullYear()} Beach Bum Chronicles</p>
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

export default PublicHome;
