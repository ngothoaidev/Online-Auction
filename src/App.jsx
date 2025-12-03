import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { products as initialProducts, bids as initialBids, questions as initialQuestions } from './data/mockData.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './components/HomePage.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import ListProducts from './components/ListProducts.jsx';
import Login from './components/AuthPage.jsx';

function App() {
  const initialUser = {
    id: 1,
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?u=1',
    rating: 95,
    isSeller: true,
  };
  const [currentPage, setCurrentPage] = useState('listproduct'); // 'home', 'listproduct', 'productdetail', etc.
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

  return (
    <Router>
      <div className={darkMode ? "dark" : ""}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
          <Header darkMode={darkMode} toggleTheme={toggleDarkMode} />
          
          <main className="grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<ListProducts />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>
    </Router>
  )
}

export default App