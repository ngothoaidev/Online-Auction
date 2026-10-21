import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import PageLoading from '../components/ui/PageLoading.jsx';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />

      <main id="main-content" tabIndex={-1} className="content outline-none">
        <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
