import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Heart, Settings, LogOut, Image } from 'lucide-react';

function AdminLayout({ children, onLogout, currentPage }) {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { path: '/admin/posts', label: 'Posts', icon: FileText, id: 'posts' },
    { path: '/admin/prints', label: 'Prints', icon: Image, id: 'prints' },
    { path: '/admin/subscribers', label: 'Subscribers', icon: Users, id: 'subscribers' },
    { path: '/admin/supporters', label: 'Supporters', icon: Heart, id: 'supporters' },
    { path: '/admin/settings', label: 'Settings', icon: Settings, id: 'settings' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
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