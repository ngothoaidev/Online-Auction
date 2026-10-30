import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { installSessionGuard } from './services/sessionGuard';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './components/ui/Feedback';
import { WatchlistProvider } from './contexts/WatchlistContext';
import ScrollToTop from './components/ScrollToTop'
import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary';
import './styles/main.css';

installSessionGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
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
  </StrictMode>,
)
