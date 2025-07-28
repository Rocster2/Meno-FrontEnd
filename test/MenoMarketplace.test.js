const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('MenoMarketplace', function () {
  // Fixture to deploy contracts and setup initial state
  async function deployMarketplaceFixture() {
    const [owner, seller, buyer, marketplace2, unauthorized] = await ethers.getSigners()
    
    // Deploy a mock NFT contract for testing
    const MockNFT = await ethers.getContractFactory('MockERC721')
    const mockNFT = await MockNFT.deploy('Test NFT', 'TNFT')
    
    // Deploy MenoMarketplace
    const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
    const marketplace = await MenoMarketplace.deploy()
    
    // Mint test NFTs
    await mockNFT.mint(seller.address, 1)
    await mockNFT.mint(seller.address, 2)
    await mockNFT.mint(buyer.address, 3)
    
    // Approve marketplace to transfer NFTs
    await mockNFT.connect(seller).setApprovalForAll(marketplace.target, true)
    
    return {
      marketplace,
      mockNFT,
      owner,
      seller,
      buyer,
      marketplace2,
      unauthorized
    }
  }
  
  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture)
      expect(await marketplace.owner()).to.equal(owner.address)
    })
    
    it('Should initialize with correct platform fee', async function () {
      const { marketplace } = await loadFixture(deployMarketplaceFixture)
      expect(await marketplace.platformFee()).to.equal(250) // 2.5%
    })
    
    it('Should authorize owner as marketplace', async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture)
      expect(await marketplace.authorizedMarketplaces(owner.address)).to.be.true
    })
  })
  
  describe('NFT Listing', function () {
    it('Should list an NFT successfully', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400 // 1 day
      
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        1,
        price,
        duration,
        true // fiat enabled
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      
      expect(event).to.not.be.undefined
      expect(event.args.seller).to.equal(seller.address)
      expect(event.args.price).to.equal(price)
      expect(event.args.fiatEnabled).to.be.true
    })
    
    it('Should fail to list NFT without ownership', async function () {
      const { marketplace, mockNFT, buyer } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      await expect(
        marketplace.connect(buyer).listNFT(mockNFT.target, 1, price, duration, false)
      ).to.be.revertedWith('Not the owner of the NFT')
    })
    
    it('Should fail to list NFT without approval', async function () {
      const { marketplace, mockNFT, buyer } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      await expect(
        marketplace.connect(buyer).listNFT(mockNFT.target, 3, price, duration, false)
      ).to.be.revertedWith('Marketplace not approved')
    })
    
    it('Should fail with invalid price', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const duration = 86400
      
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 1, 0, duration, false)
      ).to.be.revertedWith('Price must be greater than 0')
    })
    
    it('Should fail with invalid duration', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      
      await expect(
        marketplace.connect(seller).listNFT(mockNFT.target, 1, price, 1800, false) // 30 minutes
      ).to.be.revertedWith('Invalid duration')
    })
  })
  
  describe('NFT Purchase', function () {
    async function listNFTFixture() {
      const fixture = await loadFixture(deployMarketplaceFixture)
      const { marketplace, mockNFT, seller } = fixture
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        1,
        price,
        duration,
        false
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      return { ...fixture, listingId, price }
    }
    
    it('Should buy NFT successfully', async function () {
      const { marketplace, mockNFT, seller, buyer, listingId, price } = await loadFixture(listNFTFixture)
      
      const initialSellerBalance = await ethers.provider.getBalance(seller.address)
      
      await expect(
        marketplace.connect(buyer).buyNFT(listingId, { value: price })
      ).to.emit(marketplace, 'NFTSold')
        .withArgs(listingId, buyer.address, seller.address, mockNFT.target, 1, price, ethers.parseEther('0.025'))
      
      // Check NFT ownership transfer
      expect(await mockNFT.ownerOf(1)).to.equal(buyer.address)
      
      // Check seller proceeds
      const platformFee = (price * 250n) / 10000n // 2.5%
      const expectedProceeds = price - platformFee
      expect(await marketplace.sellerProceeds(seller.address)).to.equal(expectedProceeds)
    })
    
    it('Should fail to buy with insufficient payment', async function () {
      const { marketplace, listingId, price } = await loadFixture(listNFTFixture)
      const { buyer } = await loadFixture(deployMarketplaceFixture)
      
      const insufficientPrice = price - ethers.parseEther('0.1')
      
      await expect(
        marketplace.connect(buyer).buyNFT(listingId, { value: insufficientPrice })
      ).to.be.revertedWith('Insufficient payment')
    })
    
    it('Should fail for seller to buy own NFT', async function () {
      const { marketplace, seller, listingId, price } = await loadFixture(listNFTFixture)
      
      await expect(
        marketplace.connect(seller).buyNFT(listingId, { value: price })
      ).to.be.revertedWith('Cannot buy your own NFT')
    })
    
    it('Should handle excess payment correctly', async function () {
      const { marketplace, buyer, listingId, price } = await loadFixture(listNFTFixture)
      
      const excessPayment = price + ethers.parseEther('0.5')
      const initialBuyerBalance = await ethers.provider.getBalance(buyer.address)
      
      const tx = await marketplace.connect(buyer).buyNFT(listingId, { value: excessPayment })
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed * receipt.gasPrice
      
      const finalBuyerBalance = await ethers.provider.getBalance(buyer.address)
      const expectedBalance = initialBuyerBalance - price - gasUsed
      
      expect(finalBuyerBalance).to.be.closeTo(expectedBalance, ethers.parseEther('0.001'))
    })
  })
  
  describe('Listing Management', function () {
    async function listNFTFixture() {
      const fixture = await loadFixture(deployMarketplaceFixture)
      const { marketplace, mockNFT, seller } = fixture
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        1,
        price,
        duration,
        false
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      return { ...fixture, listingId, price }
    }
    
    it('Should update price successfully', async function () {
      const { marketplace, seller, listingId } = await loadFixture(listNFTFixture)
      
      const newPrice = ethers.parseEther('2.0')
      
      await expect(
        marketplace.connect(seller).updatePrice(listingId, newPrice)
      ).to.emit(marketplace, 'PriceUpdated')
        .withArgs(listingId, ethers.parseEther('1.0'), newPrice)
      
      const listing = await marketplace.getListing(listingId)
      expect(listing.price).to.equal(newPrice)
    })
    
    it('Should fail to update price by non-seller', async function () {
      const { marketplace, buyer, listingId } = await loadFixture(listNFTFixture)
      
      const newPrice = ethers.parseEther('2.0')
      
      await expect(
        marketplace.connect(buyer).updatePrice(listingId, newPrice)
      ).to.be.revertedWith('Not the seller')
    })
    
    it('Should cancel listing successfully', async function () {
      const { marketplace, seller, listingId } = await loadFixture(listNFTFixture)
      
      await expect(
        marketplace.connect(seller).cancelListing(listingId)
      ).to.emit(marketplace, 'ListingCancelled')
        .withArgs(listingId, seller.address)
      
      const listing = await marketplace.getListing(listingId)
      expect(listing.isActive).to.be.false
    })
    
    it('Should fail to cancel listing by non-seller', async function () {
      const { marketplace, buyer, listingId } = await loadFixture(listNFTFixture)
      
      await expect(
        marketplace.connect(buyer).cancelListing(listingId)
      ).to.be.revertedWith('Not the seller')
    })
  })
  
  describe('Cross-platform Synchronization', function () {
    async function listNFTFixture() {
      const fixture = await loadFixture(deployMarketplaceFixture)
      const { marketplace, mockNFT, seller, owner } = fixture
      
      // Authorize marketplace2 as external marketplace
      await marketplace.connect(owner).setAuthorizedMarketplace(fixture.marketplace2.address, true)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        1,
        price,
        duration,
        false
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      return { ...fixture, listingId, price }
    }
    
    it('Should sync with external marketplace', async function () {
      const { marketplace, seller, marketplace2, listingId } = await loadFixture(listNFTFixture)
      
      const externalListingId = ethers.keccak256(ethers.toUtf8Bytes('external-listing-123'))
      
      await expect(
        marketplace.connect(seller).syncWithExternalMarketplace(
          listingId,
          marketplace2.address,
          externalListingId
        )
      ).to.emit(marketplace, 'ExternalMarketplaceSync')
        .withArgs(listingId, marketplace2.address, externalListingId)
      
      const listing = await marketplace.getListing(listingId)
      expect(listing.externalMarketplace).to.equal(marketplace2.address)
      expect(listing.externalListingId).to.equal(externalListingId)
    })
    
    it('Should mark as sold externally', async function () {
      const { marketplace, seller, buyer, marketplace2, listingId, price } = await loadFixture(listNFTFixture)
      
      await expect(
        marketplace.connect(marketplace2).markSoldExternally(listingId, buyer.address, price)
      ).to.emit(marketplace, 'NFTSold')
        .withArgs(listingId, buyer.address, seller.address, await marketplace.mockNFT?.target || ethers.ZeroAddress, 1, price, 0)
      
      const listing = await marketplace.getListing(listingId)
      expect(listing.isActive).to.be.false
      
      const sale = await marketplace.getSale(listingId)
      expect(sale.buyer).to.equal(buyer.address)
      expect(sale.price).to.equal(price)
    })
  })
  
  describe('Admin Functions', function () {
    it('Should update platform fee', async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture)
      
      const newFee = 500 // 5%
      
      await expect(
        marketplace.connect(owner).updatePlatformFee(newFee)
      ).to.emit(marketplace, 'PlatformFeeUpdated')
        .withArgs(250, newFee)
      
      expect(await marketplace.platformFee()).to.equal(newFee)
    })
    
    it('Should fail to set fee above 10%', async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture)
      
      await expect(
        marketplace.connect(owner).updatePlatformFee(1001) // 10.01%
      ).to.be.revertedWith('Fee cannot exceed 10%')
    })
    
    it('Should authorize marketplace', async function () {
      const { marketplace, owner, marketplace2 } = await loadFixture(deployMarketplaceFixture)
      
      await marketplace.connect(owner).setAuthorizedMarketplace(marketplace2.address, true)
      expect(await marketplace.authorizedMarketplaces(marketplace2.address)).to.be.true
      
      await marketplace.connect(owner).setAuthorizedMarketplace(marketplace2.address, false)
      expect(await marketplace.authorizedMarketplaces(marketplace2.address)).to.be.false
    })
    
    it('Should withdraw platform fees', async function () {
      const { marketplace, mockNFT, seller, buyer, owner } = await loadFixture(deployMarketplaceFixture)
      
      // Create and complete a sale to generate fees
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 1, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address)
      const contractBalance = await ethers.provider.getBalance(marketplace.target)
      
      const withdrawTx = await marketplace.connect(owner).withdrawPlatformFees()
      const withdrawReceipt = await withdrawTx.wait()
      const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice
      
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address)
      const expectedBalance = initialOwnerBalance + contractBalance - gasUsed
      
      expect(finalOwnerBalance).to.be.closeTo(expectedBalance, ethers.parseEther('0.001'))
    })
  })
  
  describe('Seller Functions', function () {
    it('Should withdraw proceeds', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployMarketplaceFixture)
      
      // Create and complete a sale
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 1, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      
      const initialSellerBalance = await ethers.provider.getBalance(seller.address)
      const proceeds = await marketplace.sellerProceeds(seller.address)
      
      const withdrawTx = await marketplace.connect(seller).withdrawProceeds()
      const withdrawReceipt = await withdrawTx.wait()
      const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice
      
      const finalSellerBalance = await ethers.provider.getBalance(seller.address)
      const expectedBalance = initialSellerBalance + proceeds - gasUsed
      
      expect(finalSellerBalance).to.be.closeTo(expectedBalance, ethers.parseEther('0.001'))
      expect(await marketplace.sellerProceeds(seller.address)).to.equal(0)
    })
    
    it('Should get seller listings', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      // Create multiple listings
      await marketplace.connect(seller).listNFT(mockNFT.target, 1, price, duration, false)
      await marketplace.connect(seller).listNFT(mockNFT.target, 2, price, duration, false)
      
      const listings = await marketplace.getSellerListings(seller.address)
      expect(listings.length).to.equal(2)
    })
  })
  
  describe('View Functions', function () {
    it('Should check if listing is active', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 1, price, duration, false)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      expect(await marketplace.isListingActive(listingId)).to.be.true
      
      // Fast forward time to expire listing
      await time.increase(duration + 1)
      expect(await marketplace.isListingActive(listingId)).to.be.false
    })
    
    it('Should get current listing ID', async function () {
      const { marketplace } = await loadFixture(deployMarketplaceFixture)
      
      expect(await marketplace.getCurrentListingId()).to.equal(0)
      
      // Create a listing
      const { mockNFT, seller } = await loadFixture(deployMarketplaceFixture)
      await marketplace.connect(seller).listNFT(mockNFT.target, 1, ethers.parseEther('1.0'), 86400, false)
      
      expect(await marketplace.getCurrentListingId()).to.equal(1)
    })
  })
})

// Mock ERC721 contract for testing
const MockERC721Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}
    
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
`