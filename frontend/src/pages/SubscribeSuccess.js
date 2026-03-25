import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, Camera, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';

function SubscribeSuccess() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'free';

  const getMessage = () => {
    switch (type) {
      case 'monthly':
        return {
          title: "Welcome, Monthly Supporter!",
          subtitle: "You're now part of the Beach Bum family",
          icon: Gift,
          benefits: [
            "Your supporter badge is now active",
            "You'll get early access to new prints",
            "Behind-the-scenes content coming your way"
          ]
        };
      case 'annual':
        return {
          title: "Welcome, Annual Supporter!",
          subtitle: "You're a true Beach Bum now",
          icon: Gift,
          benefits: [
            "Your supporter badge is now active",
            "You'll get early access to new prints",
            "Behind-the-scenes content coming your way",
            "Watch for your exclusive annual gift!"
          ]
        };
      case 'donation':
        return {
          title: "Thank You for Your Donation!",
          subtitle: "Your generosity means the world",
          icon: Gift,
          benefits: [
            "Your support helps keep the camera clicking",
            "Thank you for being part of this journey"
          ]
        };
      default:
        return {
          title: "You're Subscribed!",
          subtitle: "Welcome to the OBX Beach Bum newsletter",
          icon: Mail,
          benefits: [
            "Weekly newsletter with beach photography",
            "Updates on new prints and products",
            "Event announcements and behind-the-scenes"
          ]
        };
    }
  };

  const content = getMessage();
  const IconComponent = content.icon;

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
          <Link to="/gallery" className="nav-item">Gallery</Link>
          <Link to="/archive" className="nav-item">Archive</Link>
        </nav>
      </header>

      {/* Success Content */}
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh',
        padding: '60px 20px' 
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <div style={{ marginBottom: '30px' }}>
            <CheckCircle size={80} color="#28a745" />
          </div>
          
          <h1 style={{ 
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '36px',
            margin: '0 0 10px',
            color: '#1a1a1a'
          }}>
            {content.title}
          </h1>
          
          <p style={{ fontSize: '18px', color: '#666', margin: '0 0 30px' }}>
            {content.subtitle}
          </p>

          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: '12px', 
            padding: '25px 30px',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              margin: '0 0 15px',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <IconComponent size={20} />
              What's next:
            </h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0 
            }}>
              {content.benefits.map((benefit, idx) => (
                <li key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  fontSize: '15px',
                  color: '#555',
                  marginBottom: '10px'
                }}>
                  <span style={{ color: '#28a745' }}>✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/gallery">
              <Button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} />
                Browse the Gallery
              </Button>
            </Link>
            <Link to="/archive">
              <Button variant="outline">
                Read Past Posts
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline">
                Back to Home
              </Button>
            </Link>
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
              <Link to="/gallery">Gallery</Link>
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

export default SubscribeSuccess;
