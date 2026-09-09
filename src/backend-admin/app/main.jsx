import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AdminApp from './AdminApp';
import { AdminAuthProvider } from '../auth/AdminAuthContext';
import '../styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <AdminApp />
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
