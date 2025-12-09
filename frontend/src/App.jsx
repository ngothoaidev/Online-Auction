import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { products as initialProducts, bids as initialBids, questions as initialQuestions } from './data/mockData.js';
import HomePage from './pages/HomePage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import ListProducts from './pages/ListProducts.jsx';
import Login, { Register } from './pages/AuthPage.jsx';
import Profile from './pages/ViewProfile.jsx';

import ViewAllActiveBid from './pages/ViewAllActiveBid.jsx';
import ViewAllActiveListings from './pages/ViewAllActiveListings.jsx';
import ViewAllFavouriteProducts from './pages/ViewAllFavouriteProducts.jsx';
import ViewAllReviews from './pages/ViewAllReviews.jsx';
import ViewAllSoldItems from './pages/ViewAllSoldItems.jsx';
import ViewAllWonAuctions from './pages/ViewAllWonAuctions.jsx';

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
      <div className='min-h-screen transition-colors duration-100 bg-[var(--bg)] color-[var(--text)]'>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/search" element={<ListProducts darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/product/:id" element={<ProductDetail darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            <Route path="/profile/:id" element={<Profile darkMode={darkMode} toggleDarkMode={toggleTheme} />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Dashboard Route */}
            <Route 
              path="/admin" 
              element={
                <AdminDashboard 
                  darkMode={darkMode} 
                  toggleTheme={toggleTheme}
                />
              } 
            />

            {/* User Dashboard Routes */}
            <Route path="/active-bids" element={<ViewAllActiveBid />} />
            <Route path="/active-listings" element={<ViewAllActiveListings />} />
            <Route path="/favourite-products" element={<ViewAllFavouriteProducts />} />
            <Route path="/reviews" element={<ViewAllReviews />} />
            <Route path="/sold-items" element={<ViewAllSoldItems />} />
            <Route path="/won-auctions" element={<ViewAllWonAuctions />} />
            
          </Routes>
      </div>
    </Router>
  )
}

export default App