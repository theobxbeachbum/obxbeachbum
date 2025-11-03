import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';

function Supporters({ onLogout }) {
  const [supporters, setSupporters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupporters();
  }, []);

  const fetchSupporters = async () => {
    try {
      const response = await axios.get('/supporters');
      setSupporters(response.data);
    } catch (error) {
      toast.error('Failed to fetch supporters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="supporters">
      <div data-testid="supporters-page">
        <div className="page-header">
          <h1>Supporters</h1>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : supporters.length === 0 ? (
          <div className="empty-state" data-testid="empty-supporters">
            <h3>No supporters yet</h3>
            <p>Enable supporter subscriptions in Settings to start accepting contributions</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" data-testid="supporters-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {supporters.map((supporter) => (
                  <tr key={supporter.id} data-testid={`supporter-row-${supporter.email}`}>
                    <td>{supporter.email}</td>
                    <td>${supporter.amount.toFixed(2)}/month</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        background: supporter.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: supporter.status === 'active' ? '#155724' : '#721c24'
                      }}>
                        {supporter.status}
                      </span>
                    </td>
                    <td>{new Date(supporter.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card" style={{ marginTop: '30px' }}>
          <h2>Share Supporter Link</h2>
          <p style={{ marginBottom: '15px' }}>Share this link for people to become supporters:</p>
          <div style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            border: '1px solid #e0e0e0'
          }}>
            {window.location.origin}/support
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Supporters;