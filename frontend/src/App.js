import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Shipping from "./pages/Shipping";
import Returns from "./pages/Returns";
import Copyright from "./pages/Copyright";
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import AdminLogin from '@/pages/AdminLogin';
import Dashboard from '@/pages/Dashboard';
import Posts from '@/pages/Posts';
import Prints from '@/pages/Prints';
import Subscribers from '@/pages/Subscribers';
import Settings from '@/pages/Settings';
import Supporters from '@/pages/Supporters';
import Subscribe from '@/pages/Subscribe';
import Unsubscribe from '@/pages/Unsubscribe';
import Support from '@/pages/Support';
import SupporterSuccess from '@/pages/SupporterSuccess';
import PublicHome from '@/pages/PublicHome';
import PostView from '@/pages/PostView';
import AddToHomeScreen from '@/pages/AddToHomeScreen';
import Gallery from '@/pages/Gallery';
import OrderSuccess from '@/pages/OrderSuccess';
import Muggs from '@/pages/Muggs';
import MuggsSuccess from '@/pages/MuggsSuccess';
import Notecards from '@/pages/Notecards';
import NotecardsSuccess from '@/pages/NotecardsSuccess';
import Tees from '@/pages/Tees';
import TeesSuccess from '@/pages/TeesSuccess';
import SubscribeSuccess from '@/pages/SubscribeSuccess';
import AdminMuggs from '@/pages/AdminMuggs';
import AdminNotecards from '@/pages/AdminNotecards';
import AdminTees from '@/pages/AdminTees';
import { Toaster } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set axios defaults
axios.defaults.baseURL = API;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      await axios.get('/admin/verify');
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('admin_token');
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token) => {
    localStorage.setItem('admin_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/post/:slug" element={<PostView />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/support" element={<Support />} />
          <Route path="/supporter-success" element={<SupporterSuccess />} />
          <Route path="/subscribe-success" element={<SubscribeSuccess />} />
          <Route path="/add-to-homescreen" element={<AddToHomeScreen />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/shop/muggs" element={<Muggs />} />
          <Route path="/muggs-success" element={<MuggsSuccess />} />
          <Route path="/shop/tees" element={<Tees />} />
          <Route path="/tees-success" element={<TeesSuccess />} />
          <Route path="/shop/notecards" element={<Notecards />} />
          <Route path="/notecards-success" element={<NotecardsSuccess />} />
          
          {/* Admin routes */}
          <Route
            path="/admin/login"
            element={
              isAuthenticated ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <AdminLogin onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/posts"
            element={
              isAuthenticated ? (
                <Posts onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/prints"
            element={
              isAuthenticated ? (
                <Prints onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/muggs"
            element={
              isAuthenticated ? (
                <AdminMuggs onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/notecards"
            element={
              isAuthenticated ? (
                <AdminNotecards onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/subscribers"
            element={
              isAuthenticated ? (
                <Subscribers onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/supporters"
            element={
              isAuthenticated ? (
                <Supporters onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/settings"
            element={
              isAuthenticated ? (
                <Settings onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/tees"
            element={
              isAuthenticated ? (
                <AdminTees onLogout={handleLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          
          {/* Default redirect */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
