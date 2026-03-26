import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Background image URL from user's uploaded asset
const RIPPLE_BG = 'https://customer-assets.emergentagent.com/job_e79063ba-4cfe-4d19-91ab-648826687dcc/artifacts/df9gcfoo_rippleback.jpg';

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Always Free',
    price: null,
    features: [
      'New Photos',
      'New Videos',
      'Add a comment to join the conversation.'
    ]
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 7,
    period: '/month',
    features: [
      'Access the complete archives',
      'Add a comment to join the conversation.',
      'Support the Beach Bum'
    ]
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 70,
    period: '/year',
    features: [
      'Access the complete archives',
      'Add a comment to join the conversation.',
      'Support the Beach Bum',
      '17% cheaper than subscribing monthly'
    ]
  }
];

function Subscribe() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handlePlanSelect = async () => {
    setLoading(true);

    try {
      if (selectedPlan === 'free') {
        // Free subscription
        const response = await axios.post(`${BACKEND_URL}/api/subscribers`, { email });
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

  // Common full-screen background style
  const pageStyle = {
    minHeight: '100vh',
    backgroundImage: `url(${RIPPLE_BG})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  };

  // White card style
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.97)',
    borderRadius: '8px',
    padding: '45px 40px',
    maxWidth: step === 1 ? '420px' : '700px',
    width: '100%',
    boxShadow: '0 4px 30px rgba(0,0,0,0.15)'
  };

  return (
    <div style={pageStyle}>
      {step === 1 ? (
        /* ========== STEP 1: Email Collection ========== */
        <div style={cardStyle} data-testid="subscribe-step-1">
          <div style={{ textAlign: 'center' }}>
            {/* Headline */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '22px',
              fontWeight: '700',
              margin: '0 0 20px',
              color: '#1a1a1a',
              lineHeight: '1.4'
            }}>
              the OBX Beach Bum has a new way<br />to share his Outer Banks photography.
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: '15px',
              color: '#555',
              margin: '0 0 8px',
              lineHeight: '1.6'
            }}>
              No algorithms deciding what you see.
            </p>
            <p style={{
              fontSize: '15px',
              color: '#555',
              margin: '0 0 8px',
              lineHeight: '1.6'
            }}>
              Just my mostly good photography of the Outer Banks,<br />and the occasional thing worth saying.
            </p>
            <p style={{
              fontSize: '15px',
              color: '#555',
              margin: '0 0 35px',
              lineHeight: '1.6'
            }}>
              Straight to your inbox, free.
            </p>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit}>
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '16px',
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  data-testid="subscribe-email-input"
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                data-testid="subscribe-continue-btn"
              >
                Subscribe
              </button>
            </form>

            {/* Footer text */}
            <p style={{
              fontSize: '13px',
              color: '#888',
              margin: '20px 0 0',
              textDecoration: 'underline',
              textDecorationColor: '#ccc'
            }}>
              Free newsletter. Unsubscribe anytime.
            </p>
          </div>
        </div>
      ) : (
        /* ========== STEP 2: Choose Plan ========== */
        <div style={cardStyle} data-testid="subscribe-step-2">
          <div style={{ textAlign: 'center' }}>
            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px',
              fontWeight: '700',
              margin: '0 0 10px',
              color: '#1a1a1a'
            }}>
              Choose Your Subscription Plan
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: '15px',
              color: '#666',
              margin: '0 0 35px',
              lineHeight: '1.6'
            }}>
              My photos have always been free. They still are. Support the work if the spirit moves you.
            </p>

            {/* Plan Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              marginBottom: '30px'
            }}>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    background: '#fff',
                    border: selectedPlan === plan.id ? '2px solid #5BA4D9' : '1px solid #ddd',
                    borderRadius: '10px',
                    padding: '20px 15px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    transition: 'border-color 0.2s'
                  }}
                  data-testid={`plan-${plan.id}`}
                >
                  {/* Radio indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: selectedPlan === plan.id ? 'none' : '2px solid #ccc',
                    background: selectedPlan === plan.id ? '#5BA4D9' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedPlan === plan.id && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#fff'
                      }} />
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 5px',
                    color: '#1a1a1a',
                    paddingRight: '30px'
                  }}>
                    {plan.name}
                  </h3>

                  {/* Price */}
                  {plan.price && (
                    <p style={{
                      fontSize: '14px',
                      color: '#666',
                      margin: '0 0 15px'
                    }}>
                      ${plan.price}{plan.period}
                    </p>
                  )}
                  {!plan.price && <div style={{ height: '10px' }} />}

                  {/* Features */}
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{
                        fontSize: '13px',
                        color: '#555',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Subscribe Button */}
            <button
              onClick={handlePlanSelect}
              disabled={loading}
              style={{
                padding: '14px 80px',
                fontSize: '16px',
                fontWeight: '600',
                background: '#5BA4D9',
                color: '#fff',
                border: 'none',
                borderRadius: '25px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s'
              }}
              data-testid="subscribe-final-btn"
            >
              {loading ? 'Processing...' : 'Subscribe'}
            </button>

            {/* Back button */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                data-testid="subscribe-back-btn"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 750px) {
          [data-testid="subscribe-step-2"] > div > div:nth-child(3) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Subscribe;
