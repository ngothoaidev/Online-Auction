import db from './src/config/db.js';
import { products } from './src/models/schema.js';

async function testGetProduct() {
  try {
    console.log('🔍 Testing GET Product from Database...\n');

    // Get all products
    console.log('📋 Fetching all products...');
    const allProducts = await db.select().from(products);
    
    console.log('✅ Products retrieved:\n');
    allProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - $${product.price}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Current Bid: $${product.currentBid}\n`);
    });

    console.log(`Total products in database: ${allProducts.length}`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testGetProduct();
