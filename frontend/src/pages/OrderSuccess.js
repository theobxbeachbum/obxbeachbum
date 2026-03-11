import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Package, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/prints/checkout/status/${sessionId}`);
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setCustomerEmail(response.data.customer_email);
      } else {
        setStatus('pending');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      setStatus('error');
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
          <Link to="/gallery" className="nav-item">Gallery</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Success Content */}
      <main className="order-success-page">
        {status === 'loading' && (
          <div className="success-content">
            <div className="loading-spinner"></div>
            <h2>Processing your order...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="success-content">
            <div className="success-icon">
              <CheckCircle size={80} color="#28a745" />
            </div>
            <h1>Thank You for Your Order!</h1>
            <p className="success-message">
              Your print order has been successfully placed.
            </p>
            
            <div className="order-info-cards">
              <div className="info-card">
                <Mail size={32} />
                <h3>Confirmation Email</h3>
                <p>A confirmation email has been sent to <strong>{customerEmail}</strong></p>
              </div>
              
              <div className="info-card">
                <Package size={32} />
                <h3>Shipping</h3>
                <p>Your print will be carefully prepared and shipped within 5-7 business days.</p>
              </div>
            </div>

            <div className="success-actions">
              <Link to="/gallery" className="btn-primary">Continue Shopping</Link>
              <Link to="/" className="btn-secondary">Back to Home</Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="success-content">
            <h2>Payment Processing</h2>
            <p>Your payment is still being processed. Please check your email for confirmation.</p>
            <Link to="/" className="btn-primary">Back to Home</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="success-content">
            <h2>Something went wrong</h2>
            <p>We couldn't verify your order. Please contact us if you have any questions.</p>
            <Link to="/" className="btn-primary">Back to Home</Link>
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

export default OrderSuccess;
