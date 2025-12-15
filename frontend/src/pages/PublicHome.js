import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail } from 'lucide-react';

function PublicHome() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      month: 'long', 
      day: 'numeric' 
    });
  };

  const stripMarkdown = (content) => {
    // Remove image markdown: ![alt](url)
    let text = content.replace(/!\[.*?\]\(.*?\)/g, '');
    // Remove links but keep text: [text](url) -> text
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    // Remove bold/italic markers
    text = text.replace(/\*\*?(.*?)\*\*?/g, '$1');
    text = text.replace(/__?(.*?)__?/g, '$1');
    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, '');
    // Remove horizontal rules
    text = text.replace(/^-{3,}$/gm, '');
    // Clean up extra whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  };

  const getExcerpt = (content, length = 200) => {
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
            <Link to="/admin/login" className="nav-link">Admin</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      {posts.length > 0 && (
        <section className="hero-section">
          <Link to={`/post/${posts[0].slug}`} className="hero-link">
            {getMainImage(posts[0]) && (
              <div className="hero-image-wrapper">
                <img 
                  src={getMainImage(posts[0])} 
                  alt={posts[0].title}
                  className="hero-image"
                />
              </div>
            )}
            <div className="hero-content">
              <h2 className="hero-title">{posts[0].title}</h2>
              <p className="hero-excerpt">{getExcerpt(posts[0].content, 150)}</p>
              <time className="hero-date">{formatDate(posts[0].published_at)}</time>
            </div>
          </Link>
        </section>
      )}

      {/* Posts Grid */}
      <main className="public-main">
        <div className="public-container">
          {loading ? (
            <div className="loading-spinner" style={{ margin: '60px auto' }}></div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h3>No posts yet</h3>
              <p>Check back soon for OBX photography stories</p>
            </div>
          ) : (
            <div className="posts-grid">
              {posts.slice(1).map((post) => (
                <article key={post.id} className="post-card" data-testid={`post-card-${post.slug}`}>
                  <Link to={`/post/${post.slug}`} className="post-card-link">
                    {getMainImage(post) && (
                      <div className="post-card-image-wrapper">
                        <img 
                          src={getMainImage(post)} 
                          alt={post.title}
                          className="post-card-image"
                        />
                      </div>
                    )}
                    <div className="post-card-content">
                      <h3 className="post-card-title">{post.title}</h3>
                      <p className="post-card-excerpt">{getExcerpt(post.content)}</p>
                      <time className="post-card-date">{formatDate(post.published_at)}</time>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="public-container">
          <div className="footer-content">
            <p>&copy; 2025 Daily OBX. All rights reserved.</p>
            <div className="footer-links">
              <Link to="/subscribe">Subscribe</Link>
              <Link to="/support">Support</Link>
              <Link to="/admin/login">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicHome;