import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { installSessionGuard } from './services/sessionGuard';
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './components/ui/Feedback';
import { WatchlistProvider } from './contexts/WatchlistContext';
import ScrollToTop from './components/ScrollToTop'
import ServerWakeNotice from './components/ServerWakeNotice';
import App from './App'
import './styles/main.css';

installSessionGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <ServerWakeNotice />
      <ThemeProvider>
        <AuthProvider>

          <FeedbackProvider>
          <WatchlistProvider>
            <App />

          </WatchlistProvider>
          </FeedbackProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
