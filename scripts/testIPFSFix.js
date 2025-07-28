/**
 * Test IPFS URL Fixing
 */

// Test the malformed URL from the contract
const malformedURL = 'https://ipfs.io/ipfs/ipfs://bafkreibgcdm55pf5kiuevhex2sxcz22ofpyqbtxr7no2pb37xoe6kggmt4';

console.log('Original URL:', malformedURL);

// Fix the URL
let cleanURL = malformedURL;

// Handle the specific malformed case
if (cleanURL.startsWith('https://ipfs.io/ipfs/ipfs://')) {
  cleanURL = cleanURL.replace('https://ipfs.io/ipfs/ipfs://', 'ipfs://');
}

console.log('Cleaned URL:', cleanURL);

// Convert to proper IPFS gateway URL
const gatewayURL = cleanURL.replace('ipfs://', 'https://ipfs.io/ipfs/');
console.log('Gateway URL:', gatewayURL);

// Test the URL
async function testURL() {
  try {
    console.log('\nTesting URL...');
    const response = await fetch(gatewayURL);
    
    if (response.ok) {
      const metadata = await response.json();
      console.log('✅ Success! Metadata:');
      console.log(JSON.stringify(metadata, null, 2));
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testURL();