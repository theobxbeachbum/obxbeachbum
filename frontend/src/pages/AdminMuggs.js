import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Image as ImageIcon, X, Coffee } from 'lucide-react';

const PRODUCT_TYPES = [
  { id: 'mug', label: '15oz Ceramic Coffee Mugg', price: 18 },
  { id: 'tumbler', label: '20oz Stainless Steel Tumbler', price: 28 },
  { id: 'sippy', label: '12oz Sippy Cup', price: 20 },
  { id: 'coaster', label: '4x4 Ceramic Coaster', price: 7, hasVariants: true }
];

function AdminMuggs({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    product_type: 'mug',
    price: 18,
    has_variants: false,
    active: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/admin/muggs-products');
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
        await axios.put(`/admin/muggs-products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/admin/muggs-products', formData);
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
      product_type: 'mug',
      price: 18,
      has_variants: false,
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
      product_type: product.product_type,
      price: product.price,
      has_variants: product.has_variants || false,
      active: product.active !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`/admin/muggs-products/${productId}`);
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
      price: typeInfo.price,
      has_variants: typeInfo.hasVariants || false
    });
  };

  const getProductTypeLabel = (typeId) => {
    const type = PRODUCT_TYPES.find(t => t.id === typeId);
    return type ? type.label : typeId;
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="muggs">
      <div data-testid="muggs-admin-page">
        <div className="page-header">
          <h1>B.B. Muggs Products</h1>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-product-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                {/* Image Upload */}
                <div className="form-group">
                  <label>Product Image *</label>
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
                            <p className="text-gray-500">Click to upload image</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label>Product Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Sunrise Over the Dunes Mug"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                  />
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the product"
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                  />
                </div>

                {/* Product Type */}
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Product Type *</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => handleProductTypeChange(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}
                  >
                    {PRODUCT_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.label} — ${type.price}{type.hasVariants ? '+' : ''}
                      </option>
                    ))}
                  </select>
                  {formData.has_variants && (
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      * Coasters have quantity variants: Single ($7), Set of 2 ($12), Set of 4 ($21)
                    </p>
                  )}
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
                    {editingProduct ? 'Update Product' : 'Add Product'}
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
            <Coffee className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 style={{ margin: '0 0 10px' }}>No Products Yet</h3>
            <p style={{ color: '#666', margin: '0 0 20px' }}>Add your first B.B. Muggs product to get started.</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="products-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
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
                <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#f5f5f5' }}>
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ fontSize: '16px', margin: '0 0 5px', fontWeight: '600' }}>{product.title}</h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: '0 0 10px' }}>
                    {getProductTypeLabel(product.product_type)}
                  </p>
                  <p style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 15px' }}>
                    ${product.price.toFixed(2)}{product.has_variants ? '+' : ''}
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

export default AdminMuggs;
