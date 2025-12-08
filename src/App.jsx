import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { products as initialProducts, bids as initialBids, questions as initialQuestions } from './data/mockData.js';
import HomePage from './pages/HomePage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import ListProducts from './pages/ListProducts.jsx';
import Login, { Register } from './pages/AuthPage.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';

function App() {
  const initialUser = {
    id: 1,
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?u=1',
    rating: 95,
    isSeller: true,
    isAdmin: true // Added this for logic contexts
  };

  const [currentUser, setCurrentUser] = useState(initialUser);
  const [products, setProducts] = useState(initialProducts);
  const [bids, setBids] = useState(initialBids);
  const [questions, setQuestions] = useState(initialQuestions);
  const [sellerRequests, setSellerRequests] = useState([]);
  
  // Theme Management
  const [darkMode, setDarkMode] = useState(() => {
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
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/search" element={<ListProducts darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/product/:id" element={<ProductDetail darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Route */}
            <Route 
              path="/admin" 
              element={
                <AdminDashboard 
                  darkMode={darkMode} 
                  toggleTheme={toggleTheme}
                />
              } 
            />
          </Routes>
      </div>
    </Router>
  )
}

export default App