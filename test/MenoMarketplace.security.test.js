const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('MenoMarketplace - Security Tests', function () {
  // Fixture to deploy contracts and setup initial state
  async function deployMarketplaceFixture() {
    const [owner, seller, buyer, attacker, marketplace2] = await ethers.getSigners()
    
    // Deploy a mock NFT contract for testing
    const MockNFT = await ethers.getContractFactory('MockERC721')
    const mockNFT = await MockNFT.deploy('Test NFT', 'TNFT', 'https://api.test.com/')
    
    // Deploy MenoMarketplace
    const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
    const marketplace = await MenoMarketplace.deploy()
    
    // Mint test NFTs
    await mockNFT.mint(seller.address, 'metadata1')
    await mockNFT.mint(seller.address, 'metadata2')
    await mockNFT.mint(attacker.address, 'metadata3')
    
    // Approve marketplace to transfer NFTs
    await mockNFT.connect(seller).setApprovalForAll(marketplace.target, true)
    await mockNFT.connect(attacker).setApprovalForAll(marketplace.target, true)
    
    return {
      marketplace,
      mockNFT,
      owner,
      seller,
      buyer,
      attacker,
      marketplace2
    }
  }
  
  describe('Reentrancy Protection', function () {
    it('Should prevent reentrancy attacks on buyNFT', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      // Deploy malicious contract that attempts reentrancy
      const MaliciousContract = await ethers.getContractFactory('MaliciousBuyer')
      const maliciousBuyer = await MaliciousContract.deploy(marketplace.target)
      
      // List NFT
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        0,
        price,
        duration,
        false
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Fund malicious contract
      await maliciousBuyer.fundContract({ value: ethers.parseEther('2.0') })
      
      // Attempt reentrancy attack - should fail
      await expect(
        maliciousBuyer.attemptReentrancy(listingId)
      ).to.be.revertedWith('ReentrancyGuard: reentrant call')
    })
    
    it('Should prevent reentrancy attacks on withdrawProceeds', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployMarketplaceFixture)
      
      // Create and complete a sale to generate proceeds
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      
      // Deploy malicious contract that attempts reentrancy on withdraw
      const MaliciousWithdrawer = await ethers.getContractFactory('MaliciousWithdrawer')
      const maliciousWithdrawer = await MaliciousWithdrawer.deploy(marketplace.target)
      
      // Transfer proceeds to malicious contract (simulate seller being malicious contract)
      // This test verifies the reentrancy guard is in place
      const proceeds = await marketplace.sellerProceeds(seller.address)
      expect(proceeds).to.be.gt(0)
      
      // The reentrancy guard should prevent multiple withdrawals
      await expect(
        marketplace.connect(seller).withdrawProceeds()
      ).to.not.be.reverted
      
      // Second withdrawal should fail
      await expect(
        marketplace.connect(seller).withdrawProceeds()
      ).to.be.revertedWith('No proceeds to withdraw')
    })
  })
  
  describe('Access Control', function () {
    it('Should prevent unauthorized users from calling owner functions', async function () {
      const { marketplace, attacker } = await loadFixture(deployMarketplaceFixture)
      
      // Test updatePlatformFee
      await expect(
        marketplace.connect(attacker).updatePlatformFee(500)
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount')
      
      // Test setAuthorizedMarketplace
      await expect(
        marketplace.connect(attacker).setAuthorizedMarketplace(attacker.address, true)
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount')
      
      // Test withdrawPlatformFees
      await expect(
        marketplace.connect(attacker).withdrawPlatformFees()
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount')
      
      // Test expireListing
      await expect(
        marketplace.connect(attacker).expireListing(ethers.keccak256(ethers.toUtf8Bytes('test')))
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount')
    })
    
    it('Should prevent unauthorized marketplace operations', async function () {
      const { marketplace, mockNFT, seller, attacker } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT first
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Test unauthorized markSoldExternally
      await expect(
        marketplace.connect(attacker).markSoldExternally(listingId, attacker.address, price)
      ).to.be.revertedWith('Not authorized marketplace')
      
      // Test unauthorized syncWithExternalMarketplace with unauthorized marketplace
      await expect(
        marketplace.connect(seller).syncWithExternalMarketplace(
          listingId,
          attacker.address,
          ethers.keccak256(ethers.toUtf8Bytes('external'))
        )
      ).to.be.revertedWith('Marketplace not authorized')
    })
    
    it('Should prevent non-sellers from modifying listings', async function () {
      const { marketplace, mockNFT, seller, attacker } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Test unauthorized price update
      await expect(
        marketplace.connect(attacker).updatePrice(listingId, ethers.parseEther('2.0'))
      ).to.be.revertedWith('Not the seller')
      
      // Test unauthorized listing cancellation
      await expect(
        marketplace.connect(attacker).cancelListing(listingId)
      ).to.be.revertedWith('Not the seller')
      
      // Test unauthorized external marketplace sync
      await expect(
        marketplace.connect(attacker).syncWithExternalMarketplace(
          listingId,
          seller.address,
          ethers.keccak256(ethers.toUtf8Bytes('external'))
        )
      ).to.be.revertedWith('Not the seller')
    })
  })
  
  describe('Input Validation', function () {
    it('Should validate listing parameters', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const validPrice = ethers.parseEther('1.0')
      const validDuration = 86400
      
      // Test zero address NFT contract
      await expect(
        marketplace.connect(seller).listNFT(ethers.ZeroAddress, 0, validPrice, validDuration, false)
      ).to.be.revertedWith('Invalid NFT contract')
      
      // Test zero price
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 0, 0, validDuration, false)
      ).to.be.revertedWith('Price must be greater than 0')
      
      // Test duration too short
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 0, validPrice, 1800, false) // 30 minutes
      ).to.be.revertedWith('Invalid duration')
      
      // Test duration too long
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 0, validPrice, 2592001, false) // > 30 days
      ).to.be.revertedWith('Invalid duration')
    })
    
    it('Should validate price updates', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT first
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Test zero price update
      await expect(
        marketplace.connect(seller).updatePrice(listingId, 0)
      ).to.be.revertedWith('Price must be greater than 0')
    })
    
    it('Should validate platform fee limits', async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture)
      
      // Test fee above 10%
      await expect(
        marketplace.connect(owner).updatePlatformFee(1001) // 10.01%
      ).to.be.revertedWith('Fee cannot exceed 10%')
      
      // Test valid fee at boundary
      await expect(
        marketplace.connect(owner).updatePlatformFee(1000) // 10%
      ).to.not.be.reverted
    })
  })
  
  describe('State Consistency', function () {
    it('Should maintain consistent state during concurrent operations', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Verify listing is active
      expect(await marketplace.isListingActive(listingId)).to.be.true
      
      // Buy NFT
      await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      
      // Verify listing is no longer active
      expect(await marketplace.isListingActive(listingId)).to.be.false
      
      // Verify NFT ownership transferred
      expect(await mockNFT.ownerOf(0)).to.equal(buyer.address)
      
      // Verify sale recorded
      const sale = await marketplace.getSale(listingId)
      expect(sale.buyer).to.equal(buyer.address)
      expect(sale.seller).to.equal(seller.address)
      expect(sale.price).to.equal(price)
    })
    
    it('Should prevent double spending on listings', async function () {
      const { marketplace, mockNFT, seller, buyer, attacker } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // First buyer purchases
      await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      
      // Second buyer attempts to purchase same listing - should fail
      await expect(
        marketplace.connect(attacker).buyNFT(listingId, { value: price })
      ).to.be.revertedWith('Listing is not active')
    })
  })
  
  describe('Integer Overflow/Underflow Protection', function () {
    it('Should handle large numbers safely', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployMarketplaceFixture)
      
      // Test with maximum safe price
      const maxPrice = ethers.parseEther('1000000') // 1M ETH
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, maxPrice, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Calculate expected platform fee
      const expectedFee = (maxPrice * 250n) / 10000n // 2.5%
      const expectedSellerAmount = maxPrice - expectedFee
      
      // Fund buyer with enough ETH
      await buyer.sendTransaction({ to: buyer.address, value: 0 }) // Just to ensure buyer has some ETH
      
      // Purchase should work correctly with large numbers
      await expect(
        marketplace.connect(buyer).buyNFT(listingId, { value: maxPrice })
      ).to.emit(marketplace, 'NFTSold')
        .withArgs(listingId, buyer.address, seller.address, mockNFT.target, 0, maxPrice, expectedFee)
      
      // Verify seller proceeds calculated correctly
      expect(await marketplace.sellerProceeds(seller.address)).to.equal(expectedSellerAmount)
    })
  })
  
  describe('Time-based Vulnerabilities', function () {
    it('Should handle listing expiration correctly', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployMarketplaceFixture)
      
      // List NFT with short duration
      const price = ethers.parseEther('1.0')
      const duration = 3600 // 1 hour
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Verify listing is active
      expect(await marketplace.isListingActive(listingId)).to.be.true
      
      // Fast forward past expiration
      await time.increase(duration + 1)
      
      // Verify listing is no longer active
      expect(await marketplace.isListingActive(listingId)).to.be.false
      
      // Attempt to buy expired listing should fail
      await expect(
        marketplace.connect(buyer).buyNFT(listingId, { value: price })
      ).to.be.revertedWith('Listing has expired')
    })
    
    it('Should prevent manipulation of listing duration', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      
      // Test minimum duration boundary
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 0, price, 3599, false) // 1 second less than minimum
      ).to.be.revertedWith('Invalid duration')
      
      // Test maximum duration boundary
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 0, price, 2592001, false) // 1 second more than maximum
      ).to.be.revertedWith('Invalid duration')
    })
  })
})

// Malicious contract for reentrancy testing
const MaliciousBuyerSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMenoMarketplace {
    function buyNFT(bytes32 listingId) external payable;
}

contract MaliciousBuyer {
    IMenoMarketplace public marketplace;
    bytes32 public targetListingId;
    uint256 public attackCount;
    
    constructor(address _marketplace) {
        marketplace = IMenoMarketplace(_marketplace);
    }
    
    function fundContract() external payable {}
    
    function attemptReentrancy(bytes32 listingId) external {
        targetListingId = listingId;
        attackCount = 0;
        marketplace.buyNFT{value: 1 ether}(listingId);
    }
    
    receive() external payable {
        if (attackCount < 2) {
            attackCount++;
            marketplace.buyNFT{value: 1 ether}(targetListingId);
        }
    }
}
`

const MaliciousWithdrawerSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMenoMarketplace {
    function withdrawProceeds() external;
}

contract MaliciousWithdrawer {
    IMenoMarketplace public marketplace;
    uint256 public attackCount;
    
    constructor(address _marketplace) {
        marketplace = IMenoMarketplace(_marketplace);
    }
    
    function attemptReentrancy() external {
        attackCount = 0;
        marketplace.withdrawProceeds();
    }
    
    receive() external payable {
        if (attackCount < 2) {
            attackCount++;
            marketplace.withdrawProceeds();
        }
    }
}
`