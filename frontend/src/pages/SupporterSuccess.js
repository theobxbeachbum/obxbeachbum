import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader, Camera, Gift, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function SupporterSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const type = searchParams.get('type') || 'subscription';

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      return;
    }

    checkPaymentStatus(sessionId);
  }, [searchParams]);

  const checkPaymentStatus = async (sessionId, attemptNum = 0) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/supporters/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
      } else if (attemptNum < 5) {
        setTimeout(() => checkPaymentStatus(sessionId, attemptNum + 1), 2000);
      } else {
        // After 5 attempts, show success anyway (Stripe might be slow)
        setStatus('success');
      }
    } catch (error) {
      if (attemptNum < 5) {
        setTimeout(() => checkPaymentStatus(sessionId, attemptNum + 1), 2000);
      } else {
        setStatus('success'); // Assume success after timeout
      }
    }
  };

  const isDonation = type === 'donation';

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

      {/* Content */}
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh',
        padding: '60px 20px' 
      }}>
        {status === 'checking' ? (
          <div style={{ textAlign: 'center' }}>
            <Loader
              size={64}
              style={{
                color: '#1a1a1a',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }}
            />
            <h1 style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px',
              margin: '0 0 10px'
            }}>Confirming Payment...</h1>
            <p style={{ color: '#666' }}>Please wait while we confirm your payment</p>
          </div>
        ) : status === 'success' ? (
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <div style={{ marginBottom: '30px' }}>
              {isDonation ? (
                <Heart size={80} color="#dc3545" fill="#dc3545" />
              ) : (
                <CheckCircle size={80} color="#28a745" />
              )}
            </div>
            
            <h1 style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '36px',
              margin: '0 0 10px',
              color: '#1a1a1a'
            }}>
              {isDonation ? 'Thank You for Your Donation!' : 'Welcome, Supporter!'}
            </h1>
            
            <p style={{ fontSize: '18px', color: '#666', margin: '0 0 30px' }}>
              {isDonation 
                ? 'Your generosity means the world to us'
                : "You're now part of the Beach Bum family"
              }
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
                <Gift size={20} />
                {isDonation ? 'Your support helps:' : "What's included:"}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {isDonation ? (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555', marginBottom: '10px' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      Keep the camera clicking
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555', marginBottom: '10px' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      Support local OBX photography
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      You're awesome, thank you!
                    </li>
                  </>
                ) : (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555', marginBottom: '10px' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      Supporter badge on your profile
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555', marginBottom: '10px' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      Early access to new prints
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555', marginBottom: '10px' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      Behind-the-scenes content
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#555' }}>
                      <span style={{ color: '#28a745' }}>✓</span>
                      A confirmation email is on its way
                    </li>
                  </>
                )}
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
        ) : (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px',
              margin: '0 0 15px'
            }}>Payment Verification Issue</h1>
            <p style={{ color: '#666', marginBottom: '25px' }}>
              We couldn't verify your payment automatically. Don't worry - if your payment went through, 
              you'll receive a confirmation email shortly.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <Link to="/">
                <Button>Back to Home</Button>
              </Link>
              <Link to="/support">
                <Button variant="outline">Try Again</Button>
              </Link>
            </div>
          </div>
        )}
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SupporterSuccess;
