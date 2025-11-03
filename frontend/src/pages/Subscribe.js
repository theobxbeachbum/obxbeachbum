import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, CheckCircle } from 'lucide-react';
import { config } from '@/config';

function Subscribe() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/subscribers', { email });
      setSuccess(true);
      toast.success(response.data.message);
      setEmail('');
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page" style={{
      backgroundImage: `url(${config.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="public-container" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center' }} data-testid="success-message">
            <CheckCircle
              style={{
                width: '64px',
                height: '64px',
                color: '#28a745',
                margin: '0 auto 20px'
              }}
            />
            <h1>You're Subscribed!</h1>
            <p>Thank you for subscribing to our newsletter. You'll receive updates in your inbox.</p>
          </div>
        ) : (
          <>
            <Mail
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 20px',
                display: 'block',
                color: '#1a1a1a'
              }}
            />
            <h1 data-testid="subscribe-title">Subscribe to Newsletter</h1>
            <p>Get photography stories and updates delivered to your inbox</p>

            <form onSubmit={handleSubmit} data-testid="subscribe-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  data-testid="email-input"
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
                data-testid="subscribe-btn"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>

            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
              Free newsletter. Unsubscribe anytime.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Subscribe;