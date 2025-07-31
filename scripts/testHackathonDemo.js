/**
 * Hackathon Demo Test Script
 * Tests the complete NFT off-ramp flow for demonstration
 */

require('dotenv').config();
const { ethers } = require('ethers');

async function testHackathonDemo() {
  console.log('🎬 Testing Hackathon Demo Flow...');
  
  try {
    // Test 1: Network connectivity
    console.log('\n1. Testing network connectivity...');
    const provider = new ethers.JsonRpcProvider('https://rpc-holesky.morphl2.io');
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Morph Holesky. Block: ${blockNumber}`);
    
    // Test 2: Contract accessibility
    console.log('\n2. Testing contract accessibility...');
    const MARKETPLACE_ADDRESS = '0x773a6fD164e70F4e5581A51dc4176445D9a11A85';
    const DEMO_NFT_ADDRESS = '0xf85b48fAEba258F80931030dd963e5c82fa591d8';
    
    const marketplaceABI = ["function platformFee() view returns (uint256)"];
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI, provider);
    
    const platformFee = await marketplace.platformFee();
    console.log(`✅ Marketplace accessible. Platform fee: ${Number(platformFee) / 100}%`);
    
    // Test 3: Demo simulation
    console.log('\n3. Running demo simulation...');
    const demoSteps = [
      'List NFT on marketplace',
      'Find buyer and process sale',
      'Convert ETH to USD',
      'Convert USD to native tokens',
      'Transfer complete'
    ];
    
    for (let i = 0; i < demoSteps.length; i++) {
      console.log(`   ${i + 1}. ${demoSteps[i]}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 4: Calculate demo results
    console.log('\n4. Demo conversion results:');
    const demoPrice = 0.001; // ETH
    const platformFeeAmount = demoPrice * 0.025;
    const netEth = demoPrice - platformFeeAmount;
    const usdValue = netEth * 2200; // Mock rate
    const nativeTokens = usdValue * 1650; // Mock NGN rate
    
    console.log(`   Original NFT: Token #0`);
    console.log(`   Listed price: ${demoPrice} ETH`);
    console.log(`   Platform fee: ${platformFeeAmount.toFixed(4)} ETH`);
    console.log(`   Net amount: ${netEth.toFixed(4)} ETH`);
    console.log(`   USD value: $${usdValue.toFixed(2)}`);
    console.log(`   Native tokens: ₦${nativeTokens.toLocaleString()}`);
    
    console.log('\n🎉 Hackathon demo is ready!');
    console.log('\n📋 Demo Instructions:');
    console.log('1. Connect your wallet on the dashboard');
    console.log('2. Click "🚀 Demo: Convert NFT to Native Tokens"');
    console.log('3. Watch the automated off-ramp process');
    console.log('4. Show the final conversion results');
    
    console.log('\n🏆 Key Demo Points to Highlight:');
    console.log('• Seamless NFT to native token conversion');
    console.log('• No external marketplace redirects');
    console.log('• Automated fiat off-ramp integration');
    console.log('• Real-time transaction tracking');
    console.log('• Built on Morph Layer 2 for low fees');
    
  } catch (error) {
    console.error('❌ Demo test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check internet connection');
    console.log('2. Verify contract addresses in .env');
    console.log('3. Ensure Morph Holesky testnet is accessible');
  }
}

// Run test
if (require.main === module) {
  testHackathonDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testHackathonDemo };