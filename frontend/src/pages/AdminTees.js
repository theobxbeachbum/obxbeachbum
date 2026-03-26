import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Image as ImageIcon, X, Shirt } from 'lucide-react';

const PRODUCT_TYPES = [
  { id: 'tshirt', label: 'T-Shirt', price: 25 },
  { id: 'tank', label: 'Tank Top', price: 22 },
  { id: 'hoodie', label: 'Hoodie', price: 45 },
  { id: 'cap', label: 'Cap/Hat', price: 20 }
];

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

function AdminTees({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    product_type: 'tshirt',
    sizes: DEFAULT_SIZES,
    price: 25,
    active: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/admin/tees-products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
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
        await axios.put(`/admin/tees-products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/admin/tees-products', formData);
        toast.success('Product added successfully');
      }
      setShowDialog(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      product_type: 'tshirt',
      sizes: DEFAULT_SIZES,
      price: 25,
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
      product_type: product.product_type || 'tshirt',
      sizes: product.sizes || DEFAULT_SIZES,
      price: product.price,
      active: product.active !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`/admin/tees-products/${productId}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
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

  const handleProductTypeChange = (typeId) => {
    const typeInfo = PRODUCT_TYPES.find(t => t.id === typeId);
    setFormData({
      ...formData,
      product_type: typeId,
      price: typeInfo.price
    });
  };

  const handleSizeToggle = (size) => {
    const currentSizes = formData.sizes || [];
    if (currentSizes.includes(size)) {
      setFormData({
        ...formData,
        sizes: currentSizes.filter(s => s !== size)
      });
    } else {
      setFormData({
        ...formData,
        sizes: [...currentSizes, size]
      });
    }
  };

  const getProductTypeLabel = (typeId) => {
    const type = PRODUCT_TYPES.find(t => t.id === typeId);
    return type ? type.label : typeId;
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="tees">
      <div data-testid="tees-admin-page">
        <div className="page-header">
          <h1>Beach Bum Tees</h1>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-product-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Design
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Design' : 'Add New Design'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                {/* Image Upload */}
                <div className="form-group">
                  <label>Design Image *</label>
                  {formData.image_url ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                      <img 
                        src={formData.image_url} 
                        alt="Product preview" 
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px' }} 
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
                        <X size={16} color="white" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      style={{
                        border: '2px dashed #d0d0d0',
                        borderRadius: '8px',
                        padding: '40px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        marginTop: '10px',
                        background: '#f9f9f9'
                      }}
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      <ImageIcon size={48} color="#999" style={{ marginBottom: '10px' }} />
                      <p style={{ margin: 0, color: '#666' }}>
                        {uploading ? 'Uploading...' : 'Click to upload image'}
                      </p>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </div>

                {/* Title */}
                <div className="form-group">
                  <label>Design Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., OBX Sunset Tee"
                    required
                    data-testid="product-title-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this design..."
                    rows={3}
                    style={{ minHeight: '80px' }}
                    data-testid="product-description-input"
                  />
                </div>

                {/* Product Type */}
                <div className="form-group">
                  <label>Product Type *</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {PRODUCT_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleProductTypeChange(type.id)}
                        style={{
                          padding: '10px 16px',
                          border: formData.product_type === type.id ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                          borderRadius: '8px',
                          background: formData.product_type === type.id ? '#1a1a1a' : '#fff',
                          color: formData.product_type === type.id ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {type.label} (${type.price})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Sizes */}
                <div className="form-group">
                  <label>Available Sizes</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeToggle(size)}
                        style={{
                          padding: '8px 16px',
                          border: (formData.sizes || []).includes(size) ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                          borderRadius: '6px',
                          background: (formData.sizes || []).includes(size) ? '#1a1a1a' : '#fff',
                          color: (formData.sizes || []).includes(size) ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px',
                          minWidth: '50px'
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    style={{ maxWidth: '150px' }}
                    data-testid="product-price-input"
                  />
                </div>

                {/* Active */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="active" style={{ margin: 0 }}>Active (visible on website)</label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <Button type="submit" data-testid="save-product-btn">
                    {editingProduct ? 'Update Design' : 'Add Design'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="loading-spinner" />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Shirt size={64} style={{ color: '#ccc', marginBottom: '20px' }} />
            <h3>No designs yet</h3>
            <p>Add your first tee design to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
            {products.map(product => (
              <div 
                key={product.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  opacity: product.active ? 1 : 0.6
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                  />
                  {!product.active && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#ef4444',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      INACTIVE
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 5px', fontSize: '18px' }}>{product.title}</h3>
                  <p style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>
                    {getProductTypeLabel(product.product_type)} • ${product.price}
                  </p>
                  <p style={{ margin: '0 0 10px', color: '#888', fontSize: '13px' }}>
                    Sizes: {(product.sizes || DEFAULT_SIZES).join(', ')}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(product)}
                      data-testid={`edit-${product.id}`}
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      data-testid={`delete-${product.id}`}
                    >
                      <Trash2 size={14} className="mr-1" /> Delete
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

export default AdminTees;
