import { LoginPage } from '@fe/features/auth/pages/LoginPage';
import { MailboxPage } from '@fe/features/mailbox/pages/MailboxPage';
import { PrivateRoute } from '@fe/guards/PrivateRoute';
import { ErrorBoundary } from '@fe/shared/components/ErrorBoundary';
import { Navigate, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/inbox" element={<MailboxPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
