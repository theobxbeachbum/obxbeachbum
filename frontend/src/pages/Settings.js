import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

function Settings({ onLogout }) {
  const [settings, setSettings] = useState({
    sendgrid_configured: false,
    sender_email: '',
    stripe_enabled: false,
    stripe_price_id: '',
    support_amount: 5.0,
    bunny_configured: false,
    bunny_storage_zone: '',
    bunny_storage_region: 'ny',
    bunny_pull_zone_url: ''
  });
  const [formData, setFormData] = useState({
    sendgrid_api_key: '',
    sender_email: '',
    admin_password: '',
    stripe_enabled: false,
    stripe_price_id: '',
    support_amount: 5.0,
    bunny_storage_api_key: '',
    bunny_storage_zone: '',
    bunny_storage_region: 'ny',
    bunny_pull_zone_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      setSettings(response.data);
      setFormData({
        sendgrid_api_key: '',
        sender_email: response.data.sender_email || '',
        admin_password: '',
        stripe_enabled: response.data.stripe_enabled || false,
        stripe_price_id: response.data.stripe_price_id || '',
        support_amount: response.data.support_amount || 5.0
      });
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Only send non-empty fields
      const updateData = {};
      if (formData.sendgrid_api_key) updateData.sendgrid_api_key = formData.sendgrid_api_key;
      if (formData.sender_email) updateData.sender_email = formData.sender_email;
      if (formData.admin_password) updateData.admin_password = formData.admin_password;
      updateData.stripe_enabled = formData.stripe_enabled;
      if (formData.stripe_price_id) updateData.stripe_price_id = formData.stripe_price_id;
      updateData.support_amount = formData.support_amount;

      await axios.post('/settings', updateData);
      toast.success('Settings saved successfully');
      
      // Clear sensitive fields
      setFormData({
        ...formData,
        sendgrid_api_key: '',
        admin_password: ''
      });
      
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout onLogout={onLogout} currentPage="settings">
        <div className="loading-spinner"></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={onLogout} currentPage="settings">
      <div data-testid="settings-page">
        <div className="page-header">
          <h1>Settings</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2>Email Configuration (SendGrid)</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {settings.sendgrid_configured ? (
                <span style={{ color: '#28a745' }}>✓ SendGrid is configured</span>
              ) : (
                <span style={{ color: '#dc3545' }}>SendGrid not configured - add API key below</span>
              )}
            </p>

            <div className="form-group">
              <label htmlFor="sendgrid_api_key">SendGrid API Key</label>
              <input
                type="password"
                id="sendgrid_api_key"
                data-testid="sendgrid-api-key-input"
                className="form-input"
                value={formData.sendgrid_api_key}
                onChange={(e) => setFormData({ ...formData, sendgrid_api_key: e.target.value })}
                placeholder="SG.xxxxxxxxxxxxx"
              />
              <small style={{ color: '#666' }}>
                Get your API key from{' '}
                <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer">
                  SendGrid Dashboard
                </a>
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="sender_email">Sender Email</label>
              <input
                type="email"
                id="sender_email"
                data-testid="sender-email-input"
                className="form-input"
                value={formData.sender_email}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                placeholder="newsletter@yourdomain.com"
              />
              <small style={{ color: '#666' }}>
                Must be verified in SendGrid
              </small>
            </div>
          </div>

          <div className="card">
            <h2>Supporter Subscriptions (Stripe)</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Enable optional monthly subscriptions for supporters. All content remains free.
            </p>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  data-testid="stripe-enabled-checkbox"
                  checked={formData.stripe_enabled}
                  onChange={(e) => setFormData({ ...formData, stripe_enabled: e.target.checked })}
                />
                Enable Supporter Subscriptions
              </label>
            </div>

            {formData.stripe_enabled && (
              <div className="form-group">
                <label htmlFor="support_amount">Monthly Support Amount (USD)</label>
                <input
                  type="number"
                  id="support_amount"
                  data-testid="support-amount-input"
                  className="form-input"
                  value={formData.support_amount}
                  onChange={(e) => setFormData({ ...formData, support_amount: parseFloat(e.target.value) })}
                  min="1"
                  step="0.01"
                />
                <small style={{ color: '#666' }}>
                  Supporters will pay this amount monthly (using Emergent's Stripe integration)
                </small>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Admin Password</h2>
            <div className="form-group">
              <label htmlFor="admin_password">New Password (leave blank to keep current)</label>
              <input
                type="password"
                id="admin_password"
                data-testid="admin-password-input"
                className="form-input"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" data-testid="save-settings-btn" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default Settings;