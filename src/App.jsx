import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { products as initialProducts, bids as initialBids, questions as initialQuestions } from './data/mockData.js';
import HomePage from './pages/HomePage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import ListProducts from './pages/ListProducts.jsx';
import Login, { Register } from './pages/AuthPage.jsx';

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
  const [darkMode, setDarkMode] = useState(() =>
  {
    return localStorage.getItem("theme") === "dark";
  });
  
  useEffect(() => {
    const root = document.documentElement;
    if(darkMode){
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    else{
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  function toggleTheme() {
    setDarkMode(!darkMode);
  }

  return (
    <Router>
      <div className='min-h-screen transition-colors duration-300' style={{backgroundColor: "var(--bg)", color: "var(--text)"}}>
      {/* <div className={darkMode ? "dark" : ""} style={{ '--theme-primary': THEME.primary, '--theme-secondary': THEME.secondary, '--theme-highlight': THEME.highlight, '--theme-urgent': THEME.urgent }}>   */}
        {/* <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col grow"> */}
          <Routes>
            <Route path="/" element={<HomePage darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/search" element={<ListProducts darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/product/:id" element={<ProductDetail darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        {/* </div> */}
      </div>
    </Router>
  )
}

export default App