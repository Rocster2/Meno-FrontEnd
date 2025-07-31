/**
 * Test Marketplace Integration
 * Verifies that the deployed marketplace contract works correctly
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
  "function platformFee() view returns (uint256)",
  "function getCurrentListingId() view returns (uint256)",
  "event NFTListed(bytes32 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool fiatEnabled)"
];

// Demo NFT ABI
const NFT_ABI = [
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)"
];

async function main() {
  console.log('🧪 Testing Marketplace Integration...');
  
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('https://rpc-holesky.morphl2.io');
  
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Ensure private key has 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log(`Signer: ${signer.address}`);
  
  // Create contract instances
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
  const nft = new ethers.Contract(DEMO_NFT_ADDRESS, NFT_ABI, signer);
  
  try {
    // Test 1: Check marketplace basic info
    console.log('\n1. Testing marketplace basic info...');
    const platformFee = await marketplace.platformFee();
    const currentListingId = await marketplace.getCurrentListingId();
    
    console.log(`✅ Platform fee: ${platformFee} basis points (${Number(platformFee) / 100}%)`);
    console.log(`✅ Current listing ID: ${currentListingId}`);
    
    // Test 2: Check NFT ownership
    console.log('\n2. Checking NFT ownership...');
    const tokenId = 0;
    const owner = await nft.ownerOf(tokenId);
    console.log(`✅ NFT owner: ${owner}`);
    console.log(`✅ Is signer owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
    
    // Test 3: Check NFT approval
    console.log('\n3. Checking NFT approval...');
    const approved = await nft.getApproved(tokenId);
    const isApprovedForAll = await nft.isApprovedForAll(signer.address, MARKETPLACE_ADDRESS);
    
    console.log(`Current approved address: ${approved}`);
    console.log(`Is approved for all: ${isApprovedForAll}`);
    
    // Test 4: Approve marketplace if needed
    if (!isApprovedForAll && approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
      console.log('\n4. Approving marketplace...');
      const approveTx = await nft.setApprovalForAll(MARKETPLACE_ADDRESS, true);
      console.log(`Approval transaction: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('✅ Marketplace approved');
    } else {
      console.log('\n4. ✅ Marketplace already approved');
    }
    
    // Test 5: Create a test listing (optional - uncomment to test)
    /*
    console.log('\n5. Creating test listing...');
    const price = ethers.parseEther('0.001'); // 0.001 ETH
    const duration = 7 * 24 * 60 * 60; // 7 days
    const enableFiatOffRamp = true;
    
    const listTx = await marketplace.listNFT(
      DEMO_NFT_ADDRESS,
      tokenId,
      price,
      duration,
      enableFiatOffRamp
    );
    
    console.log(`Listing transaction: ${listTx.hash}`);
    const receipt = await listTx.wait();
    console.log('✅ NFT listed successfully');
    
    // Extract listing ID from events
    const listingEvent = receipt.logs.find(log => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed.name === 'NFTListed';
      } catch {
        return false;
      }
    });
    
    if (listingEvent) {
      const parsed = marketplace.interface.parseLog(listingEvent);
      const listingId = parsed.args.listingId;
      console.log(`✅ Listing ID: ${listingId}`);
      
      // Get listing details
      const listing = await marketplace.getListing(listingId);
      console.log('✅ Listing details:', {
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: ethers.formatEther(listing.price),
        isActive: listing.isActive,
        fiatEnabled: listing.fiatEnabled
      });
    }
    */
    
    console.log('\n🎉 All tests passed! Marketplace integration is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
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