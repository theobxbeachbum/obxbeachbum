import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Mail, Users, DollarSign, FileText, CheckCircle, Circle } from 'lucide-react';

function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({
    subscribers: 0,
    posts: 0,
    supporters: 0
  });
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [subscribersRes, postsRes, supportersRes, settingsRes] = await Promise.all([
        axios.get('/subscribers'),
        axios.get('/posts'),
        axios.get('/supporters'),
        axios.get('/settings')
      ]);

      setStats({
        subscribers: subscribersRes.data.length,
        posts: postsRes.data.length,
        supporters: supportersRes.data.length
      });
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const smtpConfigured = settings?.smtp_host && settings?.smtp_username;
  const stripeConfigured = settings?.stripe_enabled;

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
          <ul style={{ paddingLeft: '0', fontSize: '16px', lineHeight: '2.2', listStyle: 'none' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {smtpConfigured ? (
                <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : (
                <Circle size={20} style={{ color: '#d0d0d0', flexShrink: 0 }} />
              )}
              <span style={{ color: smtpConfigured ? '#888' : 'inherit' }}>
                {smtpConfigured ? 'SMTP2GO configured' : 'Go to Settings to configure SMTP2GO credentials'}
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {stats.subscribers > 0 ? (
                <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : (
                <Circle size={20} style={{ color: '#d0d0d0', flexShrink: 0 }} />
              )}
              <span style={{ color: stats.subscribers > 0 ? '#888' : 'inherit' }}>
                {stats.subscribers > 0 ? `${stats.subscribers} subscribers added` : 'Add subscribers (import CSV or share subscribe form)'}
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {stats.posts > 0 ? (
                <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : (
                <Circle size={20} style={{ color: '#d0d0d0', flexShrink: 0 }} />
              )}
              <span style={{ color: stats.posts > 0 ? '#888' : 'inherit' }}>
                {stats.posts > 0 ? `${stats.posts} posts created` : 'Create a newsletter post in Posts'}
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Circle size={20} style={{ color: '#d0d0d0', flexShrink: 0 }} />
              <span>Send newsletters to subscribers from the Posts page</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {stripeConfigured ? (
                <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
              ) : (
                <Circle size={20} style={{ color: '#d0d0d0', flexShrink: 0 }} />
              )}
              <span style={{ color: stripeConfigured ? '#888' : 'inherit' }}>
                {stripeConfigured ? 'Stripe payments enabled' : 'Enable Stripe in Settings to accept contributions'}
              </span>
            </li>
          </ul>
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