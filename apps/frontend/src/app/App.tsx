import { LoginPage } from '@fe/features/auth/pages/LoginPage';
import { OAuthCallbackPage } from '@fe/features/auth/pages/OAuthCallbackPage';
import { MailboxPage } from '@fe/features/mailbox/pages/MailboxPage';
import { PrivateRoute } from '@fe/guards/PrivateRoute';
import { QueryProvider } from '@fe/providers/QueryProvider';
import { ErrorBoundary } from '@fe/shared/components/ErrorBoundary';
import { Navigate, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <QueryProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/inbox/:mailboxId" element={<MailboxPage />} />
            <Route
              path="/inbox"
              element={<Navigate to="/inbox/INBOX" replace />}
            />
          </Route>
          <Route path="/" element={<Navigate to="/inbox/INBOX" replace />} />
          <Route path="*" element={<Navigate to="/inbox/INBOX" replace />} />
        </Routes>
      </ErrorBoundary>
    </QueryProvider>
  );
}

export default App;
