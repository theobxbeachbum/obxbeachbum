import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Mail, Users, DollarSign, FileText } from 'lucide-react';

function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({
    subscribers: 0,
    posts: 0,
    supporters: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [subscribersRes, postsRes, supportersRes] = await Promise.all([
        axios.get('/subscribers'),
        axios.get('/posts'),
        axios.get('/supporters')
      ]);

      setStats({
        subscribers: subscribersRes.data.length,
        posts: postsRes.data.length,
        supporters: supportersRes.data.length
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="dashboard">
      <div data-testid="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card" data-testid="subscribers-stat">
              <h3>Active Subscribers</h3>
              <div className="stat-value">{stats.subscribers}</div>
            </div>

            <div className="stat-card" data-testid="posts-stat">
              <h3>Total Posts</h3>
              <div className="stat-value">{stats.posts}</div>
            </div>

            <div className="stat-card" data-testid="supporters-stat">
              <h3>Active Supporters</h3>
              <div className="stat-value">{stats.supporters}</div>
            </div>
          </div>
        )}

        <div className="card">
          <h2>Quick Start Guide</h2>
          <ol style={{ paddingLeft: '20px', fontSize: '16px', lineHeight: '2' }}>
            <li>Go to <strong>Settings</strong> to configure SMTP2GO credentials and sender email</li>
            <li>Add subscriber emails in <strong>Subscribers</strong> or share the subscribe form</li>
            <li>Create a newsletter post in <strong>Posts</strong></li>
            <li>Send the newsletter to all subscribers from the Posts page</li>
            <li>Enable Stripe supporters in Settings to accept monthly contributions</li>
          </ol>
        </div>

        <div className="card">
          <h2>Embed Subscribe Form</h2>
          <p style={{ marginBottom: '15px' }}>Copy this code to embed the subscribe form on your website:</p>
          <pre style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '14px',
            border: '1px solid #e0e0e0'
          }}>
            {`<iframe 
  src="${process.env.REACT_APP_BACKEND_URL}/api/embed/subscribe" 
  width="100%" 
  height="300" 
  frameborder="0"
></iframe>`}
          </pre>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;