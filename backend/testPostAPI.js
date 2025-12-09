/**
 * Test POST endpoint for creating a product
 * Run: node testPostAPI.js
 */

const API_URL = 'http://localhost:4000/products';

async function testPostProduct() {
  try {
    console.log('🧪 Testing POST /products endpoint...\n');

    const newProduct = {
      name: 'Vintage Pocket Watch',
      description: 'Beautiful antique pocket watch from 1920s',
      price: 450.50,
      startingBid: 300.00,
      currentBid: 400.00,
      category: 'Antiques',
      imageUrl: 'https://example.com/pocket-watch.jpg',
      status: 'active',
      sellerId: 2,
      auctionEndTime: '2025-12-25T23:59:59Z'
    };

    console.log('📝 Sending POST request with product data:');
    console.log(JSON.stringify(newProduct, null, 2));
    console.log('\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newProduct)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ POST Request Successful!\n');
      console.log('📦 Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n✨ Product created with ID:', data.data.id);
    } else {
      console.error('❌ POST Request Failed!');
      console.error('Status:', response.status);
      console.error('Error:', data);
    }

    process.exit(response.ok ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure the server is running:');
    console.error('   npm start');
    process.exit(1);
  }
}

testPostProduct();
