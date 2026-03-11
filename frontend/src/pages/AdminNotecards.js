import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Image as ImageIcon, X, Mail } from 'lucide-react';

function AdminNotecards({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    active: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/admin/notecards-products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch notecards');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image_url) {
      toast.error('Please upload an image');
      return;
    }
    
    try {
      if (editingProduct) {
        await axios.put(`/admin/notecards-products/${editingProduct.id}`, formData);
        toast.success('Notecard updated successfully');
      } else {
        await axios.post('/admin/notecards-products', formData);
        toast.success('Notecard added successfully');
      }
      setShowDialog(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save notecard');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      active: true
    });
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      image_url: product.image_url,
      active: product.active !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this notecard?')) return;
    
    try {
      await axios.delete(`/admin/notecards-products/${productId}`);
      toast.success('Notecard deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete notecard');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum size: 10MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post('/upload-image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setFormData({ ...formData, image_url: response.data.cdn_url });
        toast.success('Image uploaded!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="notecards">
      <div data-testid="notecards-admin-page">
        <div className="page-header">
          <h1>Mostly Good Notecards</h1>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-notecard-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Notecard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Notecard' : 'Add New Notecard'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                {/* Image Upload */}
                <div className="form-group">
                  <label>Notecard Design Image *</label>
                  {formData.image_url ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                      <img 
                        src={formData.image_url} 
                        alt="Notecard preview" 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} 
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: '50%',
                          padding: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="upload-area" style={{ 
                      border: '2px dashed #ddd', 
                      padding: '40px', 
                      textAlign: 'center', 
                      borderRadius: '8px',
                      marginTop: '10px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                        {uploading ? (
                          <div>Uploading...</div>
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-500">Click to upload notecard design image</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label>Notecard Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Sunrise Over the Dunes"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                  />
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the notecard design"
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                  />
                </div>

                {/* Pricing Info */}
                <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    <strong>Standard Pricing:</strong><br />
                    Single: $6 • Six-Pak: $30 • Ten-Pak: $40<br />
                    <span style={{ fontSize: '12px' }}>5x7, blank inside, individually wrapped, envelope included</span>
                  </p>
                </div>

                {/* Active Toggle */}
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    Active (visible on shop page)
                  </label>
                </div>

                {/* Submit */}
                <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                  <Button type="submit" style={{ flex: 1 }}>
                    {editingProduct ? 'Update Notecard' : 'Add Notecard'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', background: '#f9f9f9', borderRadius: '12px' }}>
            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 style={{ margin: '0 0 10px' }}>No Notecards Yet</h3>
            <p style={{ color: '#666', margin: '0 0 20px' }}>Add your first notecard design to get started.</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Notecard
            </Button>
          </div>
        ) : (
          <div className="products-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginTop: '20px'
          }}>
            {products.map(product => (
              <div 
                key={product.id} 
                className="product-card" 
                style={{ 
                  background: '#fff', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  opacity: product.active ? 1 : 0.6
                }}
              >
                <div style={{ aspectRatio: '5/7', overflow: 'hidden', background: '#f5f5f5' }}>
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ fontSize: '15px', margin: '0 0 5px', fontWeight: '600' }}>{product.title}</h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: '0 0 10px' }}>
                    $6 / $30 / $40
                  </p>
                  {!product.active && (
                    <span style={{ 
                      background: '#fee2e2', 
                      color: '#dc2626', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      marginBottom: '10px',
                      display: 'inline-block'
                    }}>
                      Inactive
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(product)}
                      style={{ flex: 1 }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      style={{ color: '#dc2626', borderColor: '#dc2626' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminNotecards;
