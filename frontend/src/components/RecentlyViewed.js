import { useState, useEffect } from 'react';

/**
 * Reusable Recently Viewed component for all shop pages
 * @param {string} storageKey - localStorage key (e.g., 'recentlyViewedMuggs')
 * @param {function} onItemClick - Callback when clicking a recent item
 * @param {string} title - Section title (default: "Recently Viewed")
 */
function RecentlyViewed({ storageKey, onItemClick, title = "Recently Viewed" }) {
  const [recentItems, setRecentItems] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
  }, [storageKey]);

  const clearHistory = () => {
    localStorage.removeItem(storageKey);
    setRecentItems([]);
  };

  if (recentItems.length === 0) return null;

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px 20px 0',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        border: '1px solid #eee'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>◷</span>
            {title}
          </h3>
          <button
            onClick={clearHistory}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            data-testid="clear-recent-btn"
          >
            Clear
          </button>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {recentItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick && onItemClick(item)}
              style={{
                flex: '0 0 auto',
                width: '140px',
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              data-testid={`recent-item-${item.id}`}
            >
              <img 
                src={item.image_url} 
                alt={item.title}
                style={{
                  width: '100%',
                  height: '90px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div style={{ padding: '8px 10px' }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#1a1a1a',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{item.title}</p>
                {item.price && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    fontWeight: '600'
                  }}>${item.price}</span>
                )}
                {!item.price && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#666' 
                  }}>View again →</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to add items to recently viewed
export const addToRecentlyViewed = (storageKey, item, maxItems = 6) => {
  let items = [];
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      items = JSON.parse(stored);
    } catch (e) {
      items = [];
    }
  }
  
  // Remove if already exists
  items = items.filter(i => i.id !== item.id);
  
  // Add to front
  items.unshift({
    id: item.id,
    title: item.title,
    image_url: item.image_url,
    price: item.price
  });
  
  // Limit to maxItems
  items = items.slice(0, maxItems);
  
  localStorage.setItem(storageKey, JSON.stringify(items));
  
  return items;
};

export default RecentlyViewed;
