import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Image as ImageIcon, X, Star, StarOff } from 'lucide-react';

const GALLERY_CATEGORIES = [
  'Beachscapes',
  'Dodging Shadows',
  'OBX Sunrises',
  'Waves',
  'Shorebirds',
  'Pelicans',
  'Ripples',
  'Seaoats',
  'Best Selling'
];

function Prints({ onLogout }) {
  const [prints, setPrints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPrint, setEditingPrint] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    tags: [],
    category: '',
    available_types: ['paper', 'canvas', 'metal'],
    featured: false,
    active: true
  });

  useEffect(() => {
    fetchPrints();
  }, []);

  const fetchPrints = async () => {
    try {
      // Fetch both prints and purchasable posts
      const [printsRes, postsRes] = await Promise.all([
        axios.get('/prints'),
        axios.get('/posts')
      ]);
      
      // Get purchasable posts and convert to print-like format
      const purchasablePosts = postsRes.data
        .filter(p => p.available_for_purchase && p.image_url)
        .map(p => ({
          id: p.id,
          title: p.title,
          description: 'From post',
          image_url: p.image_url,
          tags: ['post'],
          source: 'post',
          active: true
        }));
      
      // Combine and mark prints with source
      const allPrints = printsRes.data.map(p => ({ ...p, source: 'print' }));
      setPrints([...allPrints, ...purchasablePosts]);
    } catch (error) {
      toast.error('Failed to fetch prints');
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
      if (editingPrint) {
        await axios.put(`/prints/${editingPrint.id}`, formData);
        toast.success('Print updated successfully');
      } else {
        await axios.post('/prints', formData);
        toast.success('Print added successfully');
      }
      setShowDialog(false);
      resetForm();
      fetchPrints();
    } catch (error) {
      toast.error('Failed to save print');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      tags: [],
      category: '',
      available_types: ['paper', 'canvas', 'metal'],
      featured: false,
      active: true
    });
    setEditingPrint(null);
    setTagInput('');
  };

  const handleEdit = (print) => {
    // Don't allow editing posts from this page
    if (print.source === 'post') {
      toast.info('Edit this in the Posts section');
      return;
    }
    setEditingPrint(print);
    setFormData({
      title: print.title,
      description: print.description || '',
      image_url: print.image_url,
      tags: print.tags || [],
      category: print.category || '',
      available_types: print.available_types || ['paper', 'canvas', 'metal'],
      featured: print.featured || false,
      active: print.active !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (item) => {
    const isPost = item.source === 'post';
    const message = isPost 
      ? 'Remove this post from the gallery? (The post itself will remain)'
      : 'Are you sure you want to delete this print?';
    
    if (!window.confirm(message)) return;
    
    try {
      if (isPost) {
        // For posts, use the remove-from-gallery endpoint
        await axios.post(`/posts/${item.id}/remove-from-gallery`);
        toast.success('Removed from gallery');
      } else {
        await axios.delete(`/prints/${item.id}`);
        toast.success('Print deleted');
      }
      fetchPrints();
    } catch (error) {
      toast.error('Failed to delete print');
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

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ 
      ...formData, 
      tags: formData.tags.filter(t => t !== tagToRemove) 
    });
  };

  const togglePrintType = (type) => {
    const types = formData.available_types.includes(type)
      ? formData.available_types.filter(t => t !== type)
      : [...formData.available_types, type];
    setFormData({ ...formData, available_types: types });
  };

  const toggleFeatured = async (print) => {
    try {
      await axios.put(`/prints/${print.id}`, { featured: !print.featured });
      toast.success(print.featured ? 'Removed from featured' : 'Added to featured');
      fetchPrints();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="prints">
      <div data-testid="prints-page">
        <div className="page-header">
          <h1>Print Gallery</h1>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-print-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Print
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPrint ? 'Edit Print' : 'Add New Print'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                {/* Image Upload */}
                <div className="form-group">
                  <label>Photo *</label>
                  {formData.image_url ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                      <img 
                        src={formData.image_url} 
                        alt="Print preview" 
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px' }} 
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="file"
                        id="print-image-upload"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('print-image-upload').click()}
                        disabled={uploading}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    type="text"
                    id="title"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Sunrise at Cape Hatteras"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="description">Description (optional)</label>
                  <textarea
                    id="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A brief description of this photo..."
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="">-- Select Category --</option>
                    {GALLERY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="form-group">
                  <label>Tags</label>
                  <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 10px' }}>
                    Add keywords to help visitors find this print (e.g., sunrise, lighthouse, pelican)
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Type a tag and press Enter"
                      style={{ flex: 1 }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.tags.map(tag => (
                        <span 
                          key={tag}
                          style={{
                            background: '#e8f4f8',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Print Types */}
                <div className="form-group">
                  <label>Available Print Types</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    {[
                      { id: 'paper', name: 'Fine Art Paper' },
                      { id: 'canvas', name: 'Canvas' },
                      { id: 'metal', name: 'Metal' }
                    ].map(type => (
                      <label key={type.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.available_types.includes(type.id)}
                          onChange={() => togglePrintType(type.id)}
                        />
                        {type.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Featured Toggle */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>
                      <strong>Featured Print</strong>
                      <span style={{ fontSize: '13px', color: '#666', marginLeft: '8px' }}>
                        (Appears at top of Gallery)
                      </span>
                    </span>
                  </label>
                </div>

                {/* Active Toggle */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>
                      <strong>Active</strong>
                      <span style={{ fontSize: '13px', color: '#666', marginLeft: '8px' }}>
                        (Visible in Gallery)
                      </span>
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPrint ? 'Update Print' : 'Add Print'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : prints.length === 0 ? (
          <div className="empty-state">
            <h3>No prints yet</h3>
            <p>Add your first print to the gallery</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '24px',
            marginTop: '20px'
          }}>
            {prints.map((print) => (
              <div 
                key={print.id} 
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
              >
                {print.featured && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: '#ffd700',
                    color: '#333',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Star size={12} fill="#333" /> Featured
                  </div>
                )}
                {!print.active && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#dc3545',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    Inactive
                  </div>
                )}
                <img 
                  src={print.image_url} 
                  alt={print.title}
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                />
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{print.title}</h3>
                  {print.tags && print.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {print.tags.slice(0, 4).map(tag => (
                        <span 
                          key={tag}
                          style={{
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: '#666'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {print.tags.length > 4 && (
                        <span style={{ fontSize: '12px', color: '#999' }}>+{print.tags.length - 4} more</span>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {print.source === 'post' && (
                      <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', marginRight: '5px' }}>
                        From Post
                      </span>
                    )}
                    {print.source !== 'post' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleFeatured(print)}>
                          {print.featured ? <StarOff size={16} /> : <Star size={16} />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(print)}>
                          <Edit size={16} />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(print)}>
                      <Trash2 size={16} />
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

export default Prints;
