import app from './app.js';
import dotenv from 'dotenv';

// Load ENV from .env
dotenv.config();

// Bind to port (default to 4000)
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
}).on('error', (error) => {
  console.error(`Server error: ${error.message}`);
  process.exit(1);
});