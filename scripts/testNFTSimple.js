/**
 * Simple NFT Contract Test Script
 * Tests the deployed HackathonDemoNFT contract with rate limiting protection
 */

const { ethers } = require('ethers');

// Configuration
const CONTRACT_ADDRESS = '0xf85b48fAEba258F80931030dd963e5c82fa591d8';
const RPC_URL = 'https://rpc-quicknode-holesky.morphl2.io';
const EXPECTED_OWNER = '0x5230b89d6728a10b34b8EC1C740a7A7a1C4afe94';

// Contract ABI
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// Helper function to add delays between calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testContract() {
  console.log('🔧 Testing NFT Contract...');
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('RPC:', RPC_URL);
  console.log('Expected Owner:', EXPECTED_OWNER);
  console.log('');

  try {
    // Create provider
    console.log('1. Creating provider...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Test basic connection
    console.log('2. Testing RPC connection...');
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Morph Holesky. Block: ${blockNumber}`);
    
    await delay(500); // Wait 500ms between calls
    
    // Create contract instance
    console.log('3. Creating contract instance...');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Test contract calls with delays
    console.log('4. Testing contract calls...');
    
    console.log('   Getting contract name...');
    const name = await contract.name();
    console.log(`   ✅ Name: ${name}`);
    
    await delay(500);
    
    console.log('   Getting contract symbol...');
    const symbol = await contract.symbol();
    console.log(`   ✅ Symbol: ${symbol}`);
    
    await delay(500);
    
    console.log('   Getting total supply...');
    const totalSupply = await contract.totalSupply();
    console.log(`   ✅ Total Supply: ${totalSupply.toString()}`);
    
    if (totalSupply.toString() === '0') {
      console.log('   ⚠️  No NFTs minted yet');
      return;
    }
    
    await delay(500);
    
    // Test token 0
    console.log('   Getting token 0 owner...');
    const owner = await contract.ownerOf(0);
    console.log(`   ✅ Token 0 Owner: ${owner}`);
    
    if (owner.toLowerCase() === EXPECTED_OWNER.toLowerCase()) {
      console.log('   ✅ Owner matches expected address');
    } else {
      console.log('   ⚠️  Owner does not match expected address');
    }
    
    await delay(500);
    
    console.log('   Getting token 0 URI...');
    const tokenURI = await contract.tokenURI(0);
    console.log(`   ✅ Token 0 URI: ${tokenURI}`);
    
    // Test IPFS metadata
    if (tokenURI.startsWith('ipfs://')) {
      console.log('5. Testing IPFS metadata...');
      const ipfsUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
      console.log(`   Fetching: ${ipfsUrl}`);
      
      try {
        const response = await fetch(ipfsUrl);
        if (response.ok) {
          const metadata = await response.json();
          console.log('   ✅ IPFS metadata loaded:');
          console.log(`      Name: ${metadata.name}`);
          console.log(`      Description: ${metadata.description}`);
          console.log(`      Image: ${metadata.image}`);
          console.log(`      Attributes: ${JSON.stringify(metadata.attributes)}`);
        } else {
          console.log(`   ❌ IPFS fetch failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ IPFS error: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.log('');
      console.log('💡 Rate limiting detected. Try:');
      console.log('   1. Wait a few seconds and run again');
      console.log('   2. Use a different RPC endpoint');
      console.log('   3. Add more delays between calls');
    }
  }
}

// Run the test
testContract().catch(console.error);