import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { verifyToken } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreatePuzzle from './pages/CreatePuzzle';
import EditPuzzle from './pages/EditPuzzle';
import Layout from './components/Layout';

function App() {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setIsAuth(false);
      return;
    }
    verifyToken()
      .then(() => setIsAuth(true))
      .catch(() => {
        localStorage.removeItem('admin_token');
        setIsAuth(false);
      });
  }, []);

  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' }
      }} />
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Login onLogin={() => setIsAuth(true)} />} />
        <Route path="/" element={isAuth ? <Layout onLogout={() => { localStorage.removeItem('admin_token'); setIsAuth(false); }} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreatePuzzle />} />
          <Route path="edit/:id" element={<EditPuzzle />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
