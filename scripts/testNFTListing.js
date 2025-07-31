/**
 * Test NFT Listing Flow
 * Tests the complete NFT listing process with proper transaction handling
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Contract addresses
const MARKETPLACE_ADDRESS = '0x773a6fD164e70F4e5581A51dc4176445D9a11A85';
const DEMO_NFT_ADDRESS = '0xf85b48fAEba258F80931030dd963e5c82fa591d8';

// Marketplace ABI (essential functions)
const MARKETPLACE_ABI = [
  "function listNFT(address nftContract, uint256 tokenId, uint256 price, uint256 duration, bool enableFiatOffRamp) returns (bytes32)",
  "function getListing(bytes32 listingId) view returns (tuple(bytes32 listingId, address seller, address nftContract, uint256 tokenId, uint256 price, uint256 createdAt, uint256 expiresAt, bool isActive, bool fiatEnabled, address externalMarketplace, bytes32 externalListingId))",
  "function isListingActive(bytes32 listingId) view returns (bool)",
  "function cancelListing(bytes32 listingId)",
  "event NFTListed(bytes32 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool fiatEnabled)"
];

// Demo NFT ABI
const NFT_ABI = [
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)"
];

async function main() {
  console.log('🧪 Testing NFT Listing Flow...');
  
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('https://rpc-holesky.morphl2.io');
  
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  console.log(`Signer: ${signer.address}`);
  
  // Create contract instances
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
  const nft = new ethers.Contract(DEMO_NFT_ADDRESS, NFT_ABI, signer);
  
  try {
    // Test 1: Check approval
    console.log('\n1. Checking NFT approval...');
    const isApprovedForAll = await nft.isApprovedForAll(signer.address, MARKETPLACE_ADDRESS);
    console.log(`Is approved for all: ${isApprovedForAll}`);
    
    if (!isApprovedForAll) {
      console.log('❌ NFT not approved for marketplace. Please run the integration test first.');
      return;
    }
    
    // Test 2: Create a listing
    console.log('\n2. Creating NFT listing...');
    const tokenId = 0;
    const price = ethers.parseEther('0.001'); // 0.001 ETH
    const duration = 1 * 24 * 60 * 60; // 1 day
    const enableFiatOffRamp = true;
    
    console.log('Listing parameters:', {
      nftContract: DEMO_NFT_ADDRESS,
      tokenId,
      price: ethers.formatEther(price),
      duration: duration / (24 * 60 * 60) + ' days',
      enableFiatOffRamp
    });
    
    // Estimate gas
    console.log('⛽ Estimating gas...');
    const gasEstimate = await marketplace.listNFT.estimateGas(
      DEMO_NFT_ADDRESS,
      tokenId,
      price,
      duration,
      enableFiatOffRamp
    );
    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    
    // Send transaction
    console.log('📝 Sending listing transaction...');
    const tx = await marketplace.listNFT(
      DEMO_NFT_ADDRESS,
      tokenId,
      price,
      duration,
      enableFiatOffRamp,
      {
        gasLimit: gasEstimate * 150n / 100n // 50% buffer
      }
    );
    
    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('🎉 Transaction confirmed!');
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Extract listing ID from events
    let listingId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = marketplace.interface.parseLog(log);
        if (parsed.name === 'NFTListed') {
          listingId = parsed.args.listingId;
          console.log(`📋 Listing ID: ${listingId}`);
          break;
        }
      } catch (e) {
        // Skip logs that don't match our interface
      }
    }
    
    if (listingId) {
      // Test 3: Get listing details
      console.log('\n3. Getting listing details...');
      const listing = await marketplace.getListing(listingId);
      const isActive = await marketplace.isListingActive(listingId);
      
      console.log('Listing details:', {
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: ethers.formatEther(listing.price) + ' ETH',
        isActive: isActive,
        fiatEnabled: listing.fiatEnabled,
        expiresAt: new Date(Number(listing.expiresAt) * 1000).toLocaleString()
      });
      
      // Test 4: Cancel the listing (cleanup)
      console.log('\n4. Cancelling listing (cleanup)...');
      const cancelTx = await marketplace.cancelListing(listingId);
      console.log(`Cancel transaction: ${cancelTx.hash}`);
      await cancelTx.wait();
      console.log('✅ Listing cancelled');
    }
    
    console.log('\n🎉 All tests passed! NFT listing flow is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('User rejected')) {
      console.log('💡 User rejected the transaction in wallet');
    } else if (error.message.includes('insufficient funds')) {
      console.log('💡 Insufficient funds for transaction');
    } else if (error.message.includes('gas')) {
      console.log('💡 Gas-related error - try increasing gas limit');
    }
    
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };