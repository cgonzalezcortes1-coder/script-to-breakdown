import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PasswordGate from './components/PasswordGate';
import { I18nProvider } from './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <PasswordGate>
        <App />
      </PasswordGate>
    </I18nProvider>
  </React.StrictMode>
);
