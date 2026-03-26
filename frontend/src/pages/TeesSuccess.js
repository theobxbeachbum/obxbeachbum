import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Package, Mail, Shirt, MapPin, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function TeesSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [orderData, setOrderData] = useState(null);

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
      const response = await axios.get(`${BACKEND_URL}/api/tees/checkout/status/${sessionId}`);
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setOrderData(response.data);
      } else {
        setStatus('pending');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      setStatus('error');
    }
  };

  const formatAddress = (shipping) => {
    if (!shipping || !shipping.address) return null;
    const addr = shipping.address;
    return (
      <>
        <p>{shipping.name}</p>
        <p>{addr.line1}</p>
        {addr.line2 && <p>{addr.line2}</p>}
        <p>{addr.city}, {addr.state} {addr.postal_code}</p>
      </>
    );
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
          <Link to="/shop/tees" className="nav-item">Beach Bum Tees</Link>
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Success Content */}
      <main className="order-success-page" style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px', minHeight: '60vh' }}>
        {status === 'loading' && (
          <div className="success-content" style={{ textAlign: 'center', maxWidth: '700px', width: '100%' }}>
            <div className="loading-spinner"></div>
            <h2>Processing your order...</h2>
          </div>
        )}

        {status === 'success' && orderData && (
          <div className="success-content" style={{ textAlign: 'center', maxWidth: '700px', width: '100%' }}>
            <div className="success-icon" style={{ marginBottom: '30px' }}>
              <CheckCircle size={80} style={{ color: '#22c55e' }} />
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '36px', margin: '0 0 15px' }}>
              Thank You for Your Order!
            </h1>
            <p className="order-number" style={{ fontSize: '16px', color: '#666', fontFamily: 'monospace', background: '#f8f9fa', display: 'inline-block', padding: '8px 16px', borderRadius: '6px', marginBottom: '30px' }}>
              Order #{orderData.order_number}
            </p>

            {/* Order Details Card */}
            <div className="order-details-card" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '30px', marginBottom: '30px', textAlign: 'left' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', margin: '0 0 25px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                Order Details
              </h2>

              {/* Product */}
              <div className="order-item" style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                <div className="order-item-icon" style={{ width: '50px', height: '50px', background: '#f8f9fa', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shirt size={24} />
                </div>
                <div className="order-item-details" style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', margin: '0 0 5px' }}>{orderData.product_title}</h3>
                  <p className="item-specs" style={{ fontSize: '14px', color: '#666', margin: '0 0 8px' }}>
                    {orderData.product_type?.charAt(0).toUpperCase() + orderData.product_type?.slice(1)} • Size {orderData.size}
                  </p>
                  <p className="item-price" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    ${orderData.price?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Special Instructions */}
              {orderData.special_instructions && (
                <div className="order-section" style={{ padding: '20px 0', borderBottom: '1px solid #eee' }}>
                  <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: '600' }}>
                    <FileText size={18} />
                    Special Instructions
                  </div>
                  <p className="special-instructions" style={{ background: '#fffdf0', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #d4a804', fontSize: '14px', color: '#666', margin: 0, fontStyle: 'italic' }}>
                    {orderData.special_instructions}
                  </p>
                </div>
              )}

              {/* Shipping Address */}
              {orderData.shipping_address && (
                <div className="order-section" style={{ padding: '20px 0' }}>
                  <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: '600' }}>
                    <MapPin size={18} />
                    Shipping To
                  </div>
                  <div className="shipping-address" style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    {formatAddress(orderData.shipping_address)}
                  </div>
                </div>
              )}
            </div>

            {/* Info Cards */}
            <div className="order-info-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
              <div className="info-card" style={{ background: '#f8f9fa', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
                <Mail size={32} style={{ marginBottom: '15px' }} />
                <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Confirmation Email</h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' }}>
                  A confirmation has been sent to {orderData.customer_email}
                </p>
              </div>
              <div className="info-card" style={{ background: '#f8f9fa', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
                <Package size={32} style={{ marginBottom: '15px' }} />
                <h3 style={{ fontSize: '18px', margin: '0 0 10px' }}>Shipping</h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' }}>
                  Your order will be shipped within 5-7 business days
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="success-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/shop/tees" className="btn-primary" style={{ display: 'inline-block', padding: '14px 28px', background: '#1a1a1a', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '16px' }}>
                Continue Shopping
              </Link>
              <Link to="/" className="btn-secondary" style={{ display: 'inline-block', padding: '14px 28px', background: '#fff', color: '#1a1a1a', textDecoration: 'none', borderRadius: '8px', fontSize: '16px', border: '2px solid #1a1a1a' }}>
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="success-content" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
            <div className="loading-spinner"></div>
            <h2>Payment Processing...</h2>
            <p>Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="success-content" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
            <h2>Something went wrong</h2>
            <p>We couldn't find your order. Please contact us if you need assistance.</p>
            <Link to="/shop/tees" className="btn-primary" style={{ display: 'inline-block', padding: '14px 28px', background: '#1a1a1a', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '16px', marginTop: '20px' }}>
              Back to Shop
            </Link>
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
    </div>
  );
}

export default TeesSuccess;
