import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, Check, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'Stay connected with the OBX Beach Bum',
    features: [
      'Weekly newsletter',
      'Beach photography updates',
      'Event announcements'
    ],
    buttonText: 'Subscribe Free',
    popular: false
  },
  {
    id: 'monthly',
    name: 'Monthly Supporter',
    price: 7,
    period: '/month',
    description: 'Help keep the salt air flowing',
    features: [
      'Everything in Free',
      'Supporter badge',
      'Early access to new prints',
      'Behind-the-scenes content'
    ],
    buttonText: 'Support Monthly',
    popular: true
  },
  {
    id: 'annual',
    name: 'Annual Supporter',
    price: 70,
    period: '/year',
    description: 'Best value for true beach bums',
    features: [
      'Everything in Monthly',
      'Save $14/year',
      'Exclusive annual supporter gift',
      'Priority print requests'
    ],
    buttonText: 'Support Annually',
    popular: false
  }
];

function Support() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [donationAmount, setDonationAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      if (selectedPlan === 'free') {
        // Free subscription - just add to subscriber list
        const response = await axios.post(`${BACKEND_URL}/api/subscribe`, { email });
        if (response.data.success) {
          toast.success('You\'re subscribed! Check your email for confirmation.');
          setEmail('');
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

  const handleDonation = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(donationAmount);
    if (!amount || amount < 1) {
      toast.error('Please enter a donation amount of at least $1');
      return;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/supporters/donate`, {
        email,
        amount,
        origin_url: window.location.origin
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process donation. Please try again.');
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
          <Link to="/subscribe" className="nav-item subscribe-btn">Subscribe</Link>
        </nav>
      </header>

      {/* Support Hero */}
      <section className="support-hero" style={{ textAlign: 'center', padding: '60px 20px 40px', background: 'linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%)' }}>
        <Heart size={48} style={{ color: '#dc3545', marginBottom: '20px' }} />
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '42px', margin: '0 0 15px', color: '#1a1a1a' }}>Support the OBX Beach Bum</h1>
        <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>Your support helps keep the salt air flowing and the camera clicking</p>
      </section>

      {/* Subscription Plans */}
      <main className="support-main" style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' }}>
        <div className="plans-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '40px' }}>
          {SUBSCRIPTION_PLANS.map(plan => (
            <div 
              key={plan.id}
              className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
              data-testid={`plan-${plan.id}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                {plan.price === 0 ? (
                  <span className="price-amount">Free</span>
                ) : (
                  <>
                    <span className="price-amount">${plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </>
                )}
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <Check size={16} className="feature-check" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="plan-select-indicator">
                {selectedPlan === plan.id ? '✓ Selected' : 'Click to select'}
              </div>
            </div>
          ))}
        </div>

        {/* Email & Subscribe Form */}
        <div className="subscribe-form-container">
          <form onSubmit={handleSubscribe} className="subscribe-form">
            <div className="form-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="email-input"
                data-testid="support-email-input"
              />
              <Button 
                type="submit" 
                disabled={loading}
                className="subscribe-btn"
                data-testid="subscribe-btn"
              >
                {loading ? 'Processing...' : SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.buttonText}
              </Button>
            </div>
          </form>

          <div className="support-info">
            <p>✓ Cancel anytime &nbsp;•&nbsp; ✓ Secure payment via Stripe &nbsp;•&nbsp; ✓ All content remains free for everyone</p>
          </div>
        </div>

        {/* One-time Donation Section */}
        <div className="donation-section">
          <div className="donation-header" onClick={() => setShowDonation(!showDonation)}>
            <Gift size={24} />
            <span>Prefer a one-time donation?</span>
            <span className="toggle-arrow">{showDonation ? '▲' : '▼'}</span>
          </div>
          
          {showDonation && (
            <form onSubmit={handleDonation} className="donation-form">
              <p>Send a one-time tip of any amount to show your support.</p>
              <div className="donation-row">
                <div className="donation-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="donation-input"
                    data-testid="donation-amount-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !donationAmount}
                  variant="outline"
                  data-testid="donate-btn"
                >
                  {loading ? 'Processing...' : 'Send Donation'}
                </Button>
              </div>
              <div className="quick-amounts">
                {[5, 10, 25, 50].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDonationAmount(amount.toString())}
                    className={`quick-amount ${donationAmount === amount.toString() ? 'selected' : ''}`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </form>
          )}
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

export default Support;
