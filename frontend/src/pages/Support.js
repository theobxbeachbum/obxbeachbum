import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

function Support() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Check if supporter subscriptions are enabled
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      // We need to make this endpoint public or fetch via a public route
      // For now, we'll assume it's enabled and show the amount from local state
      setSettings({ enabled: true, amount: 5.0 });
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const originUrl = window.location.origin;
      const response = await axios.post('/supporters/checkout', {
        email,
        origin_url: originUrl
      });

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="public-page" style={{
      backgroundImage: 'url(https://customer-assets.emergentagent.com/job_photo-letter/artifacts/8umk2j0t_2024-OBXBB-2023-01-18_9706-Edit-Edit.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="public-container" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <Heart
          style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 20px',
            display: 'block',
            color: '#dc3545'
          }}
        />
        <h1 data-testid="support-title">Support This Newsletter</h1>
        <p>Help keep this newsletter running with a small monthly contribution</p>

        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          margin: '30px 0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#1a1a1a' }}>
            ${settings?.amount || 5}/mo
          </div>
          <div style={{ color: '#666', marginTop: '10px' }}>
            All content remains free. Your support helps us continue.
          </div>
        </div>

        <form onSubmit={handleSubmit} data-testid="support-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              data-testid="support-email-input"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <button
            type="submit"
            data-testid="become-supporter-btn"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Become a Supporter'}
          </button>
        </form>

        <div style={{ marginTop: '30px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
          <p>✓ Cancel anytime</p>
          <p>✓ Secure payment via Stripe</p>
          <p>✓ All content remains free for everyone</p>
        </div>
      </div>
    </div>
  );
}

export default Support;