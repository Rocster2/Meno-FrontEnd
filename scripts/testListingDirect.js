/**
 * Direct NFT Listing Test
 * Tests a simplified, optimized approach to NFT listing
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Contract addresses
const MARKETPLACE_ADDRESS = '0x773a6fD164e70F4e5581A51dc4176445D9a11A85';
const DEMO_NFT_ADDRESS = '0xf85b48fAEba258F80931030dd963e5c82fa591d8';

// Simplified ABI for faster interaction
const MARKETPLACE_ABI = [
  "function listNFT(address nftContract, uint256 tokenId, uint256 price, uint256 duration, bool enableFiatOffRamp) returns (bytes32)",
  "event NFTListed(bytes32 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool fiatEnabled)"
];

async function quickListing() {
  console.log('🚀 Quick NFT Listing Test...');
  
  // Setup with optimized provider
  const provider = new ethers.JsonRpcProvider('https://rpc-holesky.morphl2.io', {
    name: 'morph-holesky',
    chainId: 2810
  });
  
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  console.log(`Signer: ${signer.address}`);
  
  // Create optimized contract instance
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
  
  try {
    // Listing parameters
    const tokenId = 0;
    const price = ethers.parseEther('0.001');
    const duration = 24 * 60 * 60; // 1 day
    const enableFiatOffRamp = true;
    
    console.log('📋 Listing parameters:', {
      tokenId,
      price: ethers.formatEther(price) + ' ETH',
      duration: '1 day',
      enableFiatOffRamp
    });
    
    // Get current network status
    const blockNumber = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();
    
    console.log('🌐 Network status:', {
      blockNumber,
      gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, 'gwei') + ' gwei'
    });
    
    // Quick gas estimation
    console.log('⛽ Estimating gas...');
    const startTime = Date.now();
    
    let gasEstimate;
    try {
      gasEstimate = await marketplace.listNFT.estimateGas(
        DEMO_NFT_ADDRESS,
        tokenId,
        price,
        duration,
        enableFiatOffRamp
      );
      console.log(`✅ Gas estimated: ${gasEstimate.toString()} (${Date.now() - startTime}ms)`);
    } catch (gasError) {
      console.warn('⚠️ Gas estimation failed:', gasError.message);
      gasEstimate = 250000n; // Fallback
    }
    
    // Send transaction with optimized parameters
    console.log('📝 Sending transaction...');
    const txStartTime = Date.now();
    
    const tx = await marketplace.listNFT(
      DEMO_NFT_ADDRESS,
      tokenId,
      price,
      duration,
      enableFiatOffRamp,
      {
        gasLimit: gasEstimate * 120n / 100n,
        gasPrice: feeData.gasPrice ? feeData.gasPrice * 110n / 100n : undefined
      }
    );
    
    console.log(`✅ Transaction sent: ${tx.hash} (${Date.now() - txStartTime}ms)`);
    
    // Wait for confirmation with timeout
    console.log('⏳ Waiting for confirmation...');
    const confirmStartTime = Date.now();
    
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
      )
    ]);
    
    const confirmTime = Date.now() - confirmStartTime;
    console.log(`🎉 Confirmed in block ${receipt.blockNumber} (${confirmTime}ms)`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
    
    // Extract listing ID
    let listingId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = marketplace.interface.parseLog(log);
        if (parsed.name === 'NFTListed') {
          listingId = parsed.args.listingId;
          break;
        }
      } catch (e) {
        // Skip
      }
    }
    
    console.log('📋 Listing ID:', listingId);
    
    // Performance summary
    const totalTime = Date.now() - startTime;
    console.log('\n📊 Performance Summary:');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Gas estimation: ${Date.now() - startTime}ms`);
    console.log(`Transaction send: ${Date.now() - txStartTime}ms`);
    console.log(`Confirmation: ${confirmTime}ms`);
    
    if (totalTime < 30000) {
      console.log('✅ FAST: Transaction completed in under 30 seconds');
    } else if (totalTime < 60000) {
      console.log('⚠️ MODERATE: Transaction took 30-60 seconds');
    } else {
      console.log('❌ SLOW: Transaction took over 1 minute');
    }
    
  } catch (error) {
    console.error('❌ Quick listing failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('user rejected')) {
      console.log('💡 User cancelled transaction in wallet');
    } else if (error.message.includes('insufficient funds')) {
      console.log('💡 Insufficient ETH for gas fees');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Network congestion - try again or increase gas price');
    } else if (error.message.includes('nonce')) {
      console.log('💡 Nonce issue - wait a moment and try again');
    }
  }
}

// Run test
if (require.main === module) {
  quickListing()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { quickListing };