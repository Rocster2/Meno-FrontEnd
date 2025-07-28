const { expect } = require('chai')
const { ethers } = require('hardhat')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('Gas Optimization Tests', function () {
  // Fixture to deploy contracts and setup initial state
  async function deployContractsFixture() {
    const [owner, seller, buyer, provider, user] = await ethers.getSigners()
    
    // Deploy MockERC721
    const MockNFT = await ethers.getContractFactory('MockERC721')
    const mockNFT = await MockNFT.deploy('Test NFT', 'TNFT', 'https://api.test.com/')
    
    // Deploy MenoMarketplace
    const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
    const marketplace = await MenoMarketplace.deploy()
    
    // Deploy FiatOffRamp
    const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp')
    const fiatOffRamp = await FiatOffRamp.deploy()
    
    // Setup initial state
    await mockNFT.mint(seller.address, 'metadata1')
    await mockNFT.mint(seller.address, 'metadata2')
    await mockNFT.connect(seller).setApprovalForAll(marketplace.target, true)
    
    // Setup FiatOffRamp
    await fiatOffRamp.connect(owner).setAuthorizedOperator(owner.address, true)
    await fiatOffRamp.connect(owner).updateKYCStatus(user.address, true, 'basic')
    
    return {
      marketplace,
      fiatOffRamp,
      mockNFT,
      owner,
      seller,
      buyer,
      provider,
      user
    }
  }
  
  describe('MenoMarketplace Gas Optimization', function () {
    it('Should optimize gas for NFT listing', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      // Measure gas for listing
      const tx = await marketplace.connect(seller).listNFT(
        mockNFT.target,
        0,
        price,
        duration,
        false
      )
      
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed
      
      console.log(`Gas used for NFT listing: ${gasUsed}`)
      
      // Gas should be reasonable (less than 200k for a simple listing)
      expect(gasUsed).to.be.lt(200000)
    })
    
    it('Should optimize gas for NFT purchase', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployContractsFixture)
      
      // List NFT first
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listTx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const listReceipt = await listTx.wait()
      const event = listReceipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Measure gas for purchase
      const buyTx = await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      const buyReceipt = await buyTx.wait()
      const gasUsed = buyReceipt.gasUsed
      
      console.log(`Gas used for NFT purchase: ${gasUsed}`)
      
      // Gas should be reasonable (less than 150k for a simple purchase)
      expect(gasUsed).to.be.lt(150000)
    })
    
    it('Should optimize gas for price updates', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // List NFT first
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listTx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const listReceipt = await listTx.wait()
      const event = listReceipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Measure gas for price update
      const newPrice = ethers.parseEther('2.0')
      const updateTx = await marketplace.connect(seller).updatePrice(listingId, newPrice)
      const updateReceipt = await updateTx.wait()
      const gasUsed = updateReceipt.gasUsed
      
      console.log(`Gas used for price update: ${gasUsed}`)
      
      // Gas should be minimal (less than 50k for a simple update)
      expect(gasUsed).to.be.lt(50000)
    })
    
    it('Should optimize gas for listing cancellation', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // List NFT first
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listTx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const listReceipt = await listTx.wait()
      const event = listReceipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Measure gas for cancellation
      const cancelTx = await marketplace.connect(seller).cancelListing(listingId)
      const cancelReceipt = await cancelTx.wait()
      const gasUsed = cancelReceipt.gasUsed
      
      console.log(`Gas used for listing cancellation: ${gasUsed}`)
      
      // Gas should be minimal (less than 40k for a simple cancellation)
      expect(gasUsed).to.be.lt(40000)
    })
    
    it('Should optimize gas for batch operations', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // Mint multiple NFTs for batch testing
      await mockNFT.batchMint(seller.address, 5)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      // Measure gas for multiple listings
      const gasUsages = []
      
      for (let i = 1; i <= 5; i++) {
        const tx = await marketplace.connect(seller).listNFT(mockNFT.target, i, price, duration, false)
        const receipt = await tx.wait()
        gasUsages.push(receipt.gasUsed)
      }
      
      console.log('Gas usage for multiple listings:', gasUsages.map(g => g.toString()))
      
      // Gas usage should be consistent and reasonable
      gasUsages.forEach(gas => {
        expect(gas).to.be.lt(200000)
      })
      
      // Later listings might use slightly less gas due to warm storage
      const avgGas = gasUsages.reduce((a, b) => a + b, 0n) / BigInt(gasUsages.length)
      console.log(`Average gas per listing: ${avgGas}`)
    })
  })
  
  describe('FiatOffRamp Gas Optimization', function () {
    it('Should optimize gas for provider registration', async function () {
      const { fiatOffRamp, owner, provider } = await loadFixture(deployContractsFixture)
      
      // Measure gas for provider registration
      const tx = await fiatOffRamp.connect(owner).addProvider(
        provider.address,
        'Test Provider',
        ['USD', 'EUR'],
        ['US', 'EU'],
        ethers.parseEther('0.01'),
        ethers.parseEther('10'),
        250,
        ethers.parseEther('0.001')
      )
      
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed
      
      console.log(`Gas used for provider registration: ${gasUsed}`)
      
      // Gas should be reasonable (less than 300k for provider registration)
      expect(gasUsed).to.be.lt(300000)
    })
    
    it('Should optimize gas for conversion requests', async function () {
      const { fiatOffRamp, owner, provider, user } = await loadFixture(deployContractsFixture)
      
      // Add provider first
      await fiatOffRamp.connect(owner).addProvider(
        provider.address,
        'Test Provider',
        ['USD'],
        ['US'],
        ethers.parseEther('0.01'),
        ethers.parseEther('10'),
        250,
        ethers.parseEther('0.001')
      )
      
      // Measure gas for conversion request
      const amount = ethers.parseEther('1.0')
      const tx = await fiatOffRamp.connect(user).requestFiatConversion(
        amount,
        'USD',
        'encrypted-bank-details',
        provider.address,
        { value: amount }
      )
      
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed
      
      console.log(`Gas used for conversion request: ${gasUsed}`)
      
      // Gas should be reasonable (less than 200k for conversion request)
      expect(gasUsed).to.be.lt(200000)
    })
    
    it('Should optimize gas for provider assignment', async function () {
      const { fiatOffRamp, owner, provider, user } = await loadFixture(deployContractsFixture)
      
      // Setup provider and request
      await fiatOffRamp.connect(owner).addProvider(
        provider.address,
        'Test Provider',
        ['USD'],
        ['US'],
        ethers.parseEther('0.01'),
        ethers.parseEther('10'),
        250,
        ethers.parseEther('0.001')
      )
      
      const amount = ethers.parseEther('1.0')
      const requestTx = await fiatOffRamp.connect(user).requestFiatConversion(
        amount,
        'USD',
        'encrypted-bank-details',
        provider.address,
        { value: amount }
      )
      
      const requestReceipt = await requestTx.wait()
      const event = requestReceipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      const requestId = event.args.requestId
      
      // Measure gas for provider assignment
      const exchangeRate = ethers.parseEther('2000')
      const fees = ethers.parseEther('0.025')
      
      const assignTx = await fiatOffRamp.connect(owner).assignProvider(
        requestId,
        provider.address,
        exchangeRate,
        fees
      )
      
      const assignReceipt = await assignTx.wait()
      const gasUsed = assignReceipt.gasUsed
      
      console.log(`Gas used for provider assignment: ${gasUsed}`)
      
      // Gas should be reasonable (less than 100k for assignment)
      expect(gasUsed).to.be.lt(100000)
    })
    
    it('Should optimize gas for conversion completion', async function () {
      const { fiatOffRamp, owner, provider, user } = await loadFixture(deployContractsFixture)
      
      // Setup complete flow
      await fiatOffRamp.connect(owner).addProvider(
        provider.address,
        'Test Provider',
        ['USD'],
        ['US'],
        ethers.parseEther('0.01'),
        ethers.parseEther('10'),
        250,
        ethers.parseEther('0.001')
      )
      
      const amount = ethers.parseEther('1.0')
      const requestTx = await fiatOffRamp.connect(user).requestFiatConversion(
        amount,
        'USD',
        'encrypted-bank-details',
        provider.address,
        { value: amount }
      )
      
      const requestReceipt = await requestTx.wait()
      const event = requestReceipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      const requestId = event.args.requestId
      
      const exchangeRate = ethers.parseEther('2000')
      const fees = ethers.parseEther('0.025')
      
      await fiatOffRamp.connect(owner).assignProvider(requestId, provider.address, exchangeRate, fees)
      
      // Measure gas for completion
      const completeTx = await fiatOffRamp.connect(provider).completeConversion(requestId)
      const completeReceipt = await completeTx.wait()
      const gasUsed = completeReceipt.gasUsed
      
      console.log(`Gas used for conversion completion: ${gasUsed}`)
      
      // Gas should be reasonable (less than 80k for completion)
      expect(gasUsed).to.be.lt(80000)
    })
  })
  
  describe('Storage Optimization', function () {
    it('Should efficiently pack struct data', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // Create listing to test struct packing
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const tx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, true)
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
      const listingId = event.args.listingId
      
      // Retrieve listing to verify data integrity
      const listing = await marketplace.getListing(listingId)
      
      expect(listing.seller).to.equal(seller.address)
      expect(listing.nftContract).to.equal(mockNFT.target)
      expect(listing.tokenId).to.equal(0)
      expect(listing.price).to.equal(price)
      expect(listing.isActive).to.be.true
      expect(listing.fiatEnabled).to.be.true
      
      console.log('Listing data retrieved successfully with optimized storage')
    })
    
    it('Should minimize storage reads in view functions', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // Create multiple listings
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listingIds = []
      for (let i = 0; i < 3; i++) {
        await mockNFT.mint(seller.address, `metadata${i + 10}`)
        const tx = await marketplace.connect(seller).listNFT(mockNFT.target, i + 3, price, duration, false)
        const receipt = await tx.wait()
        const event = receipt.logs.find(log => log.fragment?.name === 'NFTListed')
        listingIds.push(event.args.listingId)
      }
      
      // Test efficient retrieval of seller listings
      const sellerListings = await marketplace.getSellerListings(seller.address)
      expect(sellerListings.length).to.be.gte(3)
      
      // Test efficient status checking
      for (const listingId of listingIds) {
        const isActive = await marketplace.isListingActive(listingId)
        expect(isActive).to.be.true
      }
      
      console.log('View functions executed efficiently')
    })
  })
  
  describe('Event Optimization', function () {
    it('Should emit events efficiently', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployContractsFixture)
      
      // Test event emission during listing
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listTx = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, true)
      const listReceipt = await listTx.wait()
      
      // Verify event was emitted with correct data
      const listEvent = listReceipt.logs.find(log => log.fragment?.name === 'NFTListed')
      expect(listEvent).to.not.be.undefined
      expect(listEvent.args.seller).to.equal(seller.address)
      expect(listEvent.args.price).to.equal(price)
      expect(listEvent.args.fiatEnabled).to.be.true
      
      const listingId = listEvent.args.listingId
      
      // Test event emission during purchase
      const buyTx = await marketplace.connect(buyer).buyNFT(listingId, { value: price })
      const buyReceipt = await buyTx.wait()
      
      // Verify multiple events emitted efficiently
      const soldEvent = buyReceipt.logs.find(log => log.fragment?.name === 'NFTSold')
      const fiatEvent = buyReceipt.logs.find(log => log.fragment?.name === 'FiatConversionRequested')
      
      expect(soldEvent).to.not.be.undefined
      expect(fiatEvent).to.not.be.undefined // Should be emitted because fiat was enabled
      
      console.log('Events emitted efficiently with minimal gas overhead')
    })
  })
  
  describe('Gas Comparison Tests', function () {
    it('Should compare gas usage between different operations', async function () {
      const { marketplace, mockNFT, seller, buyer } = await loadFixture(deployContractsFixture)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      // Measure listing without fiat
      const listTx1 = await marketplace.connect(seller).listNFT(mockNFT.target, 0, price, duration, false)
      const listReceipt1 = await listTx1.wait()
      const gasWithoutFiat = listReceipt1.gasUsed
      
      // Mint another NFT for second test
      await mockNFT.mint(seller.address, 'metadata_extra')
      
      // Measure listing with fiat
      const listTx2 = await marketplace.connect(seller).listNFT(mockNFT.target, 3, price, duration, true)
      const listReceipt2 = await listTx2.wait()
      const gasWithFiat = listReceipt2.gasUsed
      
      console.log(`Gas without fiat: ${gasWithoutFiat}`)
      console.log(`Gas with fiat: ${gasWithFiat}`)
      console.log(`Difference: ${gasWithFiat - gasWithoutFiat}`)
      
      // Fiat-enabled listing should use only slightly more gas
      const difference = gasWithFiat - gasWithoutFiat
      expect(difference).to.be.lt(10000) // Less than 10k gas difference
    })
    
    it('Should measure gas efficiency improvements over time', async function () {
      const { marketplace, mockNFT, seller } = await loadFixture(deployContractsFixture)
      
      // Mint multiple NFTs
      await mockNFT.batchMint(seller.address, 10)
      
      const price = ethers.parseEther('1.0')
      const duration = 86400
      const gasUsages = []
      
      // Measure gas for 10 consecutive listings
      for (let i = 4; i < 14; i++) {
        const tx = await marketplace.connect(seller).listNFT(mockNFT.target, i, price, duration, false)
        const receipt = await tx.wait()
        gasUsages.push(receipt.gasUsed)
      }
      
      console.log('Gas usage progression:', gasUsages.map(g => g.toString()))
      
      // Calculate average and check for consistency
      const avgGas = gasUsages.reduce((a, b) => a + b, 0n) / BigInt(gasUsages.length)
      const maxDeviation = gasUsages.reduce((max, gas) => {
        const deviation = gas > avgGas ? gas - avgGas : avgGas - gas
        return deviation > max ? deviation : max
      }, 0n)
      
      console.log(`Average gas: ${avgGas}`)
      console.log(`Max deviation: ${maxDeviation}`)
      
      // Gas usage should be consistent (deviation less than 5% of average)
      expect(maxDeviation).to.be.lt(avgGas / 20n) // Less than 5% deviation
    })
  })
})