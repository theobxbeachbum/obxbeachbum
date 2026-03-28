import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Download, Trash2, Upload } from 'lucide-react';

function Subscribers({ onLogout }) {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row if it contains "email"
      const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;
      
      let imported = 0;
      let skipped = 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
        const email = columns[0]; // First column is email
        const firstName = columns[1] || null; // Second column is first name
        const lastName = columns[2] || null; // Third column is last name
        
        // Basic email validation - skip rows with empty or invalid emails
        if (email && email.includes('@') && email.includes('.')) {
          try {
            await axios.post('/subscribers', { 
              email,
              first_name: firstName,
              last_name: lastName
            });
            imported++;
          } catch (error) {
            // Already exists or invalid
            skipped++;
          }
        } else {
          skipped++;
        }
      }
      
      toast.success(`Imported ${imported} subscribers${skipped > 0 ? `, ${skipped} skipped` : ''}`);
      setShowImportDialog(false);
      fetchSubscribers();
    } catch (error) {
      toast.error('Failed to import CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            
            {/* Import CSV Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="import-subscribers-btn">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Subscribers from CSV</DialogTitle>
                </DialogHeader>
                <div style={{ padding: '10px 0' }}>
                  <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                    Upload a CSV file with subscriber info:
                  </p>
                  <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
                    <strong>Column format:</strong><br />
                    email, firstname, lastname<br /><br />
                    <strong>Example:</strong><br />
                    email,firstname,lastname<br />
                    john@example.com,John,Doe<br />
                    jane@example.com,Jane,Smith
                  </div>
                  <p style={{ marginBottom: '15px', color: '#888', fontSize: '13px' }}>
                    Rows without valid emails will be skipped.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    style={{ display: 'none' }}
                    data-testid="csv-file-input"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    style={{ width: '100%' }}
                  >
                    {importing ? 'Importing...' : 'Select CSV File'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                  <th>Name</th>
                  <th>Subscribed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} data-testid={`subscriber-row-${subscriber.email}`}>
                    <td>{subscriber.email}</td>
                    <td style={{ color: subscriber.first_name ? 'inherit' : '#999' }}>
                      {subscriber.first_name || subscriber.last_name 
                        ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
                        : '—'}
                    </td>
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