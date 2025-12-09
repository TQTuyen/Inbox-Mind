import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

async function enableMocking() {
  if (!USE_MOCK) {
    console.log('🚀 Running with REAL API - MSW disabled');
    return;
  }

  console.log('🔧 Running with MOCK API - MSW enabled');
  const { worker } = await import('./mocks/mockServer');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </StrictMode>
  );
});
