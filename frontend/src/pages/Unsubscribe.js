import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { XCircle, CheckCircle } from 'lucide-react';

function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link');
      return;
    }

    handleUnsubscribe(token);
  }, [searchParams]);

  const handleUnsubscribe = async (token) => {
    try {
      const response = await axios.get(`/unsubscribe?token=${token}`);
      setStatus('success');
      setMessage(response.data.message);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Failed to unsubscribe');
    }
  };

  return (
    <div className="public-page">
      <div className="public-container">
        {status === 'loading' ? (
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '20px' }}>Processing...</p>
          </div>
        ) : status === 'success' ? (
          <div style={{ textAlign: 'center' }} data-testid="unsubscribe-success">
            <CheckCircle
              style={{
                width: '64px',
                height: '64px',
                color: '#28a745',
                margin: '0 auto 20px'
              }}
            />
            <h1>Unsubscribed</h1>
            <p>{message}</p>
            <p style={{ marginTop: '20px', color: '#666' }}>
              You've been removed from our mailing list.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }} data-testid="unsubscribe-error">
            <XCircle
              style={{
                width: '64px',
                height: '64px',
                color: '#dc3545',
                margin: '0 auto 20px'
              }}
            />
            <h1>Oops!</h1>
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Unsubscribe;