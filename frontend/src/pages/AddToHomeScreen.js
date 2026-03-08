import { Link } from 'react-router-dom';
import { Smartphone, Share, MoreVertical, Plus, Check } from 'lucide-react';

function AddToHomeScreen() {
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
          <Link to="/archive" className="nav-item">Archive</Link>
          <Link to="/about" className="nav-item">About</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="homescreen-page">
        <div className="homescreen-container">
          <div className="homescreen-header">
            <Smartphone className="homescreen-icon" />
            <h1>Add to Home Screen</h1>
            <p className="homescreen-intro">
              Get quick access to the OBX Beach Bum right from your phone's home screen — 
              just like an app, but without downloading anything!
            </p>
          </div>

          <div className="instructions-grid">
            {/* iPhone Instructions */}
            <div className="instruction-card">
              <div className="card-header iphone">
                <span className="device-icon">🍎</span>
                <h2>iPhone / iPad</h2>
                <p className="browser-note">Using Safari</p>
              </div>
              
              <ol className="steps-list">
                <li>
                  <div className="step-icon">
                    <Share size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Tap the Share button</strong>
                    <p>It's the square with an arrow pointing up, located at the bottom of Safari</p>
                  </div>
                </li>
                <li>
                  <div className="step-icon">
                    <Plus size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Scroll down and tap "Add to Home Screen"</strong>
                    <p>You may need to scroll down in the share menu to find it</p>
                  </div>
                </li>
                <li>
                  <div className="step-icon">
                    <Check size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Tap "Add" in the top right</strong>
                    <p>You can customize the name if you'd like, then tap Add</p>
                  </div>
                </li>
              </ol>

              <div className="card-footer">
                <p>✨ That's it! Look for the OBX Beach Bum icon on your home screen.</p>
              </div>
            </div>

            {/* Android Instructions */}
            <div className="instruction-card">
              <div className="card-header android">
                <span className="device-icon">🤖</span>
                <h2>Android</h2>
                <p className="browser-note">Using Chrome</p>
              </div>
              
              <ol className="steps-list">
                <li>
                  <div className="step-icon">
                    <MoreVertical size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Tap the menu button</strong>
                    <p>It's the three dots (⋮) in the top right corner of Chrome</p>
                  </div>
                </li>
                <li>
                  <div className="step-icon">
                    <Plus size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Tap "Add to Home Screen" or "Install App"</strong>
                    <p>The wording may vary slightly depending on your device</p>
                  </div>
                </li>
                <li>
                  <div className="step-icon">
                    <Check size={20} />
                  </div>
                  <div className="step-content">
                    <strong>Tap "Add" to confirm</strong>
                    <p>You can edit the name before adding if you prefer</p>
                  </div>
                </li>
              </ol>

              <div className="card-footer">
                <p>✨ Done! The icon will appear on your home screen or app drawer.</p>
              </div>
            </div>
          </div>

          <div className="homescreen-benefits">
            <h3>Why add to home screen?</h3>
            <ul>
              <li><strong>One-tap access</strong> — No typing URLs or searching</li>
              <li><strong>App-like experience</strong> — Opens in full screen</li>
              <li><strong>Always there</strong> — Easy to check for new posts</li>
              <li><strong>No app store needed</strong> — It's just a shortcut</li>
            </ul>
          </div>

          <div className="back-home">
            <Link to="/" className="back-home-btn">← Back to Home</Link>
          </div>
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
              <Link to="/archive">Archive</Link>
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

export default AddToHomeScreen;
