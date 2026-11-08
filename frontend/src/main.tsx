import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { ThemeProvider } from './contexts/ThemeContext';
import { installSessionGuard } from './services/sessionGuard';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './components/ui/Feedback';
import { WatchlistProvider } from './contexts/WatchlistContext';
import ScrollToTop from './components/ScrollToTop'
import ServerWakeNotice from './components/ServerWakeNotice';
import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary';
import './styles/main.css';

installSessionGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ScrollToTop />
      <ServerWakeNotice />
      <ThemeProvider>
        <AuthProvider>

          <FeedbackProvider>
          <WatchlistProvider>
            <AppErrorBoundary><App /></AppErrorBoundary>

          </WatchlistProvider>
          </FeedbackProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
