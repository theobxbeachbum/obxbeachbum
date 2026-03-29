import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Heart, Settings, LogOut, Image, Coffee, Mail, Shirt, Menu, X } from 'lucide-react';

function AdminLayout({ children, onLogout, currentPage }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { path: '/admin/posts', label: 'Posts', icon: FileText, id: 'posts' },
    { path: '/admin/prints', label: 'Prints', icon: Image, id: 'prints' },
    { path: '/admin/muggs', label: 'B.B. Muggs', icon: Coffee, id: 'muggs' },
    { path: '/admin/tees', label: 'Beach Bum Tees', icon: Shirt, id: 'tees' },
    { path: '/admin/notecards', label: 'Notecards', icon: Mail, id: 'notecards' },
    { path: '/admin/subscribers', label: 'Subscribers', icon: Users, id: 'subscribers' },
    { path: '/admin/supporters', label: 'Supporters', icon: Heart, id: 'supporters' },
    { path: '/admin/settings', label: 'Settings', icon: Settings, id: 'settings' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <header className="admin-mobile-header">
        <h2>Admin Panel</h2>
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          data-testid="mobile-menu-btn"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - shows on desktop, slides in on mobile */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Newsletter</h2>
          <p>Admin Panel</p>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? 'active' : ''}
                onClick={handleNavClick}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="logout-btn"
            onClick={onLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" style={{ display: 'inline', marginRight: '8px' }} />
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}

export default AdminLayout;