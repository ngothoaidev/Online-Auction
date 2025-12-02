import { useState } from 'react'
import { products as initialProducts, currentUser as initialUser, bids as initialBids, questions as initialQuestions } from './data/mockData.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './components/HomePage.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [products, setProducts] = useState(initialProducts);
  const [bids, setBids] = useState(initialBids);
  const [questions, setQuestions] = useState(initialQuestions);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  function toggleDarkMode() {
    setDarkMode(!darkMode);
  }

  const handleNavigate = (page, productId) => {
    setCurrentPage(page);
    if (productId) {
      setSelectedProductId(productId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    handleNavigate('home');
  };


  return (
    <div className='min-h-screen flex flex-col bg-[#1A1225] text-white'>
      <Header currentUser={currentUser} setCurrentPage={handleNavigate} onLogout={handleLogout} darkMode={darkMode} toggleTheme={toggleDarkMode} />
      {/* Main Content based on currentPage */}
      <main>
        {currentPage === 'home' && (
          <HomePage />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App