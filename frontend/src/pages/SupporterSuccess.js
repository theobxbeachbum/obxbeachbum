import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader } from 'lucide-react';

function SupporterSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

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
      const response = await axios.get(`/supporters/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
      } else if (attemptNum < maxAttempts) {
        // Continue polling
        setAttempts(attemptNum + 1);
        setTimeout(() => checkPaymentStatus(sessionId, attemptNum + 1), 2000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      if (attemptNum < maxAttempts) {
        setAttempts(attemptNum + 1);
        setTimeout(() => checkPaymentStatus(sessionId, attemptNum + 1), 2000);
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <div className="public-page">
      <div className="public-container">
        {status === 'checking' ? (
          <div style={{ textAlign: 'center' }} data-testid="payment-checking">
            <Loader
              style={{
                width: '64px',
                height: '64px',
                color: '#1a1a1a',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }}
            />
            <h1>Confirming Payment...</h1>
            <p>Please wait while we confirm your supporter subscription</p>
          </div>
        ) : status === 'success' ? (
          <div style={{ textAlign: 'center' }} data-testid="payment-success">
            <CheckCircle
              style={{
                width: '64px',
                height: '64px',
                color: '#28a745',
                margin: '0 auto 20px'
              }}
            />
            <h1>Thank You for Your Support!</h1>
            <p style={{ marginBottom: '30px' }}>
              Your subscription is now active. You'll receive a confirmation email shortly.
            </p>
            <Link to="/subscribe" className="btn btn-primary">
              Subscribe to Newsletter
            </Link>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }} data-testid="payment-error">
            <h1>Payment Verification Failed</h1>
            <p>We couldn't verify your payment. Please check your email for confirmation or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupporterSuccess;