import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toast } from './components/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* 전역 Toast 알림 — 앱 어디서나 toast.success() 등으로 호출 가능 */}
      <Toast />
    </BrowserRouter>
  </React.StrictMode>
);
