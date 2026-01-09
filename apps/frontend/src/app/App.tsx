import { useEffect } from 'react';
import { LoginPage } from '@fe/features/auth/pages/LoginPage';
import { OAuthCallbackPage } from '@fe/features/auth/pages/OAuthCallbackPage';
import { KanbanPage } from '@fe/features/kanban/pages/KanbanPage';
import { MailboxPage } from '@fe/features/mailbox/pages/MailboxPage';
import { PrivateRoute } from '@fe/guards/PrivateRoute';
import { QueryProvider } from '@fe/providers/QueryProvider';
import { ErrorBoundary } from '@fe/shared/components/ErrorBoundary';
import { Toaster } from '@fe/shared/components/ui/toaster';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';

function App() {
  const { isDarkMode } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
            <Route path="/kanban" element={<KanbanPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/inbox/INBOX" replace />} />
          <Route path="*" element={<Navigate to="/inbox/INBOX" replace />} />
        </Routes>
        <Toaster />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export default App;
