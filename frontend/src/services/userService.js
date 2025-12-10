// import supabase from '../api/supabaseClient';
import { mockUserData as MOCK_USERS } from "../data";

// A flag to toggle modes. 
// You can also use an environment variable: import.meta.env.VITE_USE_MOCK === 'true'
const USE_MOCK_DATA = true; 

const userService = {
  getAll: async () => {
    // 1. If Mock Mode is ON, return fake data immediately
    if (USE_MOCK_DATA) {
      console.log("⚠️ Using MOCK Data for Users");
      // Simulate network delay (optional, but good for testing loading states)
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_USERS), 500);
      });
    }

    // 2. Otherwise, fetch real data from Supabase
    // const { data, error } = await supabase.from('users').select('*');
    // if (error) throw error;
    return data;
  }
};

export default userService;