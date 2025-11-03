import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Download, Trash2 } from 'lucide-react';

function Subscribers({ onLogout }) {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const response = await axios.get('/subscribers');
      setSubscribers(response.data);
    } catch (error) {
      toast.error('Failed to fetch subscribers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/subscribers', { email: newEmail });
      toast.success('Subscriber added');
      setShowDialog(false);
      setNewEmail('');
      fetchSubscribers();
    } catch (error) {
      toast.error('Failed to add subscriber');
    }
  };

  const handleRemove = async (email) => {
    if (!window.confirm(`Remove ${email} from subscribers?`)) return;
    
    try {
      await axios.delete(`/subscribers/${email}`);
      toast.success('Subscriber removed');
      fetchSubscribers();
    } catch (error) {
      toast.error('Failed to remove subscriber');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/subscribers/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'subscribers.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Subscribers exported');
    } catch (error) {
      toast.error('Failed to export subscribers');
    }
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="subscribers">
      <div data-testid="subscribers-page">
        <div className="page-header">
          <h1>Subscribers</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              data-testid="export-subscribers-btn"
              onClick={handleExport}
              disabled={subscribers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button data-testid="add-subscriber-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subscriber</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubscriber} data-testid="add-subscriber-form">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      data-testid="subscriber-email-input"
                      className="form-input"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="save-subscriber-btn">
                      Add Subscriber
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : subscribers.length === 0 ? (
          <div className="empty-state" data-testid="empty-subscribers">
            <h3>No subscribers yet</h3>
            <p>Add subscribers manually or share your subscribe form</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" data-testid="subscribers-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subscribed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} data-testid={`subscriber-row-${subscriber.email}`}>
                    <td>{subscriber.email}</td>
                    <td>{new Date(subscriber.subscribed_at).toLocaleDateString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`remove-subscriber-${subscriber.email}`}
                        onClick={() => handleRemove(subscriber.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Subscribers;