import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />

      <main id="main-content" tabIndex={-1} className="content outline-none">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
