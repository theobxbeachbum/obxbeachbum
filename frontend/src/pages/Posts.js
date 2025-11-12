import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Send, Trash2, Edit } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function Posts({ onLogout }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    image_urls: []
  });
  const [sending, setSending] = useState(null);
  const [uploading, setUploading] = useState(false);
  const quillRef = useRef(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/posts');
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await axios.put(`/posts/${editingPost.id}`, formData);
        toast.success('Post updated successfully');
      } else {
        await axios.post('/posts', formData);
        toast.success('Post created successfully');
      }
      setShowDialog(false);
      setFormData({ title: '', content: '', image_url: '' });
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      image_url: post.image_url || '',
      image_urls: post.image_urls || []
    });
    setShowDialog(true);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`/posts/${postId}`);
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleSendNewsletter = async (postId) => {
    if (!window.confirm('Send this post to all subscribers? This action cannot be undone.')) return;
    
    setSending(postId);
    try {
      const response = await axios.post('/newsletter/send', { post_id: postId });
      toast.success(response.data.message);
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send newsletter');
    } finally {
      setSending(null);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum size: 10MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post('/upload-image', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Add to image_urls array
        const newImageUrls = [...formData.image_urls, response.data.cdn_url];
        setFormData({ ...formData, image_urls: newImageUrls });
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Image upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    const newImageUrls = formData.image_urls.filter((_, i) => i !== index);
    setFormData({ ...formData, image_urls: newImageUrls });
  };

  return (
    <AdminLayout onLogout={onLogout} currentPage="posts">
      <div data-testid="posts-page">
        <div className="page-header">
          <h1>Newsletter Posts</h1>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-post-btn"
                onClick={() => {
                  setEditingPost(null);
                  setFormData({ title: '', content: '', image_url: '', image_urls: [] });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} data-testid="post-form">
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    data-testid="post-title-input"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="image_url">Images (optional)</label>
                  
                  {/* Show uploaded images */}
                  {formData.image_urls && formData.image_urls.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      {formData.image_urls.map((url, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          marginBottom: '10px',
                          padding: '10px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px'
                        }}>
                          <img 
                            src={url} 
                            alt={`Upload ${index + 1}`}
                            style={{ 
                              width: '80px', 
                              height: '80px', 
                              objectFit: 'cover',
                              borderRadius: '4px'
                            }}
                          />
                          <div style={{ flex: 1, fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                            {url}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveImage(index)}
                            data-testid={`remove-image-${index}`}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload button */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload').click()}
                      disabled={uploading}
                      data-testid="upload-image-btn"
                    >
                      {uploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    Upload multiple images to Bunny.net CDN (configure in Settings)
                  </small>
                  
                  {/* Legacy single image URL input for backward compatibility */}
                  <div style={{ marginTop: '15px' }}>
                    <label htmlFor="image_url" style={{ fontSize: '14px', color: '#666' }}>Or paste single image URL:</label>
                    <input
                      type="url"
                      id="image_url"
                      data-testid="post-image-input"
                      className="form-input"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="content">Content</label>
                  <textarea
                    id="content"
                    data-testid="post-content-input"
                    className="form-textarea"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={12}
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
                  <Button type="submit" data-testid="save-post-btn">
                    {editingPost ? 'Update Post' : 'Create Post'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : posts.length === 0 ? (
          <div className="empty-state" data-testid="empty-posts">
            <h3>No posts yet</h3>
            <p>Create your first newsletter post to get started</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" data-testid="posts-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} data-testid={`post-row-${post.id}`}>
                    <td>{post.title}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        background: post.status === 'published' ? '#d4edda' : '#f8f9fa',
                        color: post.status === 'published' ? '#155724' : '#666'
                      }}>
                        {post.status}
                      </span>
                    </td>
                    <td>{new Date(post.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`edit-post-${post.id}`}
                          onClick={() => handleEdit(post)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`send-post-${post.id}`}
                          onClick={() => handleSendNewsletter(post.id)}
                          disabled={sending === post.id}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`delete-post-${post.id}`}
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default Posts;