import { Link } from 'react-router-dom';
import { Coffee, Shirt, Mail } from 'lucide-react';

const shopInfo = {
  muggs: {
    title: 'B.B. Muggs',
    subtitle: 'Beach Bum Drinkware',
    description: 'Start your morning with a sunrise coffee in style. Our collection of beach-themed mugs and drinkware is coming soon.',
    icon: Coffee
  },
  tees: {
    title: 'Beach Bum Tees',
    subtitle: 'Coastal Apparel',
    description: 'Wear the beach wherever you go. Our line of comfortable, coastal-inspired t-shirts and apparel is coming soon.',
    icon: Shirt
  },
  notecards: {
    title: 'Notecards',
    subtitle: 'Share the Beauty',
    description: 'Send a piece of the Outer Banks to someone special. Our photography notecards are coming soon.',
    icon: Mail
  }
};

function ShopPlaceholder({ type }) {
  const info = shopInfo[type] || shopInfo.muggs;
  const Icon = info.icon;

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
              <Link to="/shop/muggs" className={`dropdown-item ${type === 'muggs' ? 'active' : ''}`}>B.B. Muggs</Link>
              <Link to="/shop/tees" className={`dropdown-item ${type === 'tees' ? 'active' : ''}`}>Beach Bum Tees</Link>
              <Link to="/shop/notecards" className={`dropdown-item ${type === 'notecards' ? 'active' : ''}`}>Notecards</Link>
            </div>
          </div>
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Coming Soon Content */}
      <main className="placeholder-page">
        <div className="placeholder-content">
          <div className="placeholder-icon">
            <Icon size={64} />
          </div>
          <h1>{info.title}</h1>
          <p className="placeholder-subtitle">{info.subtitle}</p>
          <p className="placeholder-description">{info.description}</p>
          
          <div className="coming-soon-badge">
            Coming Soon
          </div>

          <div className="placeholder-cta">
            <p>Want to be notified when we launch?</p>
            <Link to="/subscribe" className="btn-primary">Subscribe to Updates</Link>
          </div>

          <Link to="/gallery" className="browse-gallery-link">
            Browse our Print Gallery →
          </Link>
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

export default ShopPlaceholder;
