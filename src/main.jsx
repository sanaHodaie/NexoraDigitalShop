import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { productsResource } from './api/products';

// Start the public catalogue request before mounting routes and their effects.
if (location.pathname === '/' || location.pathname.startsWith('/category/')) productsResource.load();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
