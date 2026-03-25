import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, Heart, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 7,
    period: '/month',
    features: [
      'Weekly newsletter',
      'Supporter badge',
      'Early access to new prints',
      'Support the Beach Bum'
    ],
    popular: false
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 70,
    period: '/year',
    subtext: '($5.83/month)',
    features: [
      'Weekly newsletter',
      'Supporter badge',
      'Early access to new prints',
      'Support the Beach Bum',
      '17% cheaper than monthly'
    ],
    popular: true
  },
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    features: [
      { text: 'Weekly newsletter', included: true },
      { text: 'Supporter badge', included: false },
      { text: 'Early access to new prints', included: false },
      { text: 'Support the Beach Bum', included: false }
    ],
    popular: false,
    isFree: true
  }
];

function Subscribe() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setStep(2);
  };

  const handlePlanSelect = async () => {
    setLoading(true);

    try {
      if (selectedPlan === 'free') {
        // Free subscription
        const response = await axios.post(`${BACKEND_URL}/api/subscribe`, { email });
        if (response.data.success) {
          navigate('/subscribe-success?type=free');
        }
      } else {
        // Paid subscription - redirect to Stripe
        const response = await axios.post(`${BACKEND_URL}/api/supporters/checkout`, {
          email,
          plan: selectedPlan,
          origin_url: window.location.origin
        });

        if (response.data.url) {
          window.location.href = response.data.url;
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process. Please try again.');
    } finally {
      setLoading(false);
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
          <Link to="/archive" className="nav-item">Archive</Link>
        </nav>
      </header>

      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        
        {step === 1 ? (
          /* Step 1: Email Entry */
          <div style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
            {/* Hero Image */}
            <div style={{ 
              width: '100%', 
              height: '250px', 
              borderRadius: '12px', 
              overflow: 'hidden',
              marginBottom: '30px',
              background: 'linear-gradient(135deg, #87CEEB 0%, #f4a460 100%)'
            }}>
              <img 
                src="https://customer-assets.emergentagent.com/job_photo-news/artifacts/ds3e93fb_logo-ish.jpg"
                alt="the OBX Beach Bum"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <h1 style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '32px',
              margin: '0 0 10px',
              color: '#1a1a1a'
            }}>
              the OBX Beach Bum
            </h1>
            
            <p style={{ fontSize: '16px', color: '#666', margin: '0 0 30px' }}>
              Mostly good beach photography and stories from the Outer Banks
            </p>

            <form onSubmit={handleEmailSubmit}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                  data-testid="subscribe-email-input"
                />
                <Button type="submit" style={{ padding: '14px 28px' }} data-testid="subscribe-continue-btn">
                  Subscribe
                </Button>
              </div>
            </form>

            <p style={{ fontSize: '13px', color: '#999' }}>
              Free and paid options available
            </p>

            <div style={{ marginTop: '30px' }}>
              <Link to="/" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>
                No thanks →
              </Link>
            </div>
          </div>
        ) : (
          /* Step 2: Choose Plan */
          <div style={{ textAlign: 'center', maxWidth: '800px', width: '100%' }}>
            <h1 style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '32px',
              margin: '0 0 10px',
              color: '#1a1a1a'
            }}>
              Choose a subscription plan
            </h1>
            
            <p style={{ fontSize: '16px', color: '#666', margin: '0 0 40px' }}>
              Subscribing as <strong>{email}</strong>
            </p>

            {/* Plans */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
              {SUBSCRIPTION_PLANS.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    background: '#fff',
                    border: selectedPlan === plan.id 
                      ? '2px solid #4A90D9' 
                      : '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '25px 20px',
                    cursor: 'pointer',
                    position: 'relative',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  data-testid={`plan-${plan.id}`}
                >
                  {/* Selection indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: selectedPlan === plan.id ? 'none' : '2px solid #ddd',
                    background: selectedPlan === plan.id ? '#4A90D9' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedPlan === plan.id && <Check size={14} color="#fff" />}
                  </div>

                  <h3 style={{ fontSize: '18px', margin: '0 0 8px', color: '#1a1a1a', fontWeight: '600' }}>
                    {plan.name}
                  </h3>
                  
                  <div style={{ marginBottom: '15px' }}>
                    {plan.price === 0 ? (
                      <span style={{ fontSize: '16px', color: '#666' }}>Free</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>${plan.price}</span>
                        <span style={{ fontSize: '14px', color: '#666' }}>{plan.period}</span>
                        {plan.subtext && (
                          <span style={{ fontSize: '13px', color: '#888', display: 'block' }}>{plan.subtext}</span>
                        )}
                      </>
                    )}
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((feature, idx) => {
                      const isObject = typeof feature === 'object';
                      const text = isObject ? feature.text : feature;
                      const included = isObject ? feature.included : true;
                      
                      return (
                        <li key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '8px',
                          fontSize: '13px',
                          color: included ? '#555' : '#bbb',
                          marginBottom: '8px',
                          textDecoration: included ? 'none' : 'line-through'
                        }}>
                          {included ? (
                            <Check size={14} style={{ color: '#666', marginTop: '2px', flexShrink: 0 }} />
                          ) : (
                            <span style={{ color: '#ccc', marginTop: '2px', flexShrink: 0 }}>✕</span>
                          )}
                          {text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Subscribe Button */}
            <Button 
              onClick={handlePlanSelect}
              disabled={loading}
              style={{ 
                padding: '16px 60px', 
                fontSize: '16px',
                background: '#4A90D9',
                marginBottom: '15px'
              }}
              data-testid="subscribe-final-btn"
            >
              {loading ? 'Processing...' : 'Subscribe'}
            </Button>

            <p style={{ fontSize: '13px', color: '#999' }}>
              {selectedPlan === 'free' 
                ? 'Free subscription - no payment required'
                : 'Secure payment via Stripe • Cancel anytime'
              }
            </p>

            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => setStep(1)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#666', 
                  fontSize: '14px', 
                  cursor: 'pointer' 
                }}
              >
                ← Back
              </button>
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
    </div>
  );
}

export default Subscribe;
