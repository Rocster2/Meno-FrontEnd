const { expect } = require('chai')
const { ethers } = require('hardhat')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('Deployment Tests', function () {
  // Test deployment on different networks
  describe('Contract Deployment', function () {
    async function deployAllContractsFixture() {
      const [owner, operator, provider, user] = await ethers.getSigners()
      
      console.log('Deploying contracts...')
      console.log('Network:', await ethers.provider.getNetwork())
      console.log('Owner address:', owner.address)
      
      // Deploy MockERC721 for testing
      const MockNFT = await ethers.getContractFactory('MockERC721')
      const mockNFT = await MockNFT.deploy('Test NFT Collection', 'TNC', 'https://api.testnft.com/')
      await mockNFT.waitForDeployment()
      
      console.log('MockERC721 deployed to:', mockNFT.target)
      
      // Deploy MenoMarketplace
      const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
      const marketplace = await MenoMarketplace.deploy()
      await marketplace.waitForDeployment()
      
      console.log('MenoMarketplace deployed to:', marketplace.target)
      
      // Deploy FiatOffRamp
      const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp')
      const fiatOffRamp = await FiatOffRamp.deploy()
      await fiatOffRamp.waitForDeployment()
      
      console.log('FiatOffRamp deployed to:', fiatOffRamp.target)
      
      return {
        mockNFT,
        marketplace,
        fiatOffRamp,
        owner,
        operator,
        provider,
        user
      }
    }
    
    it('Should deploy all contracts successfully', async function () {
      const { mockNFT, marketplace, fiatOffRamp, owner } = await loadFixture(deployAllContractsFixture)
      
      // Verify MockERC721 deployment
      expect(await mockNFT.name()).to.equal('Test NFT Collection')
      expect(await mockNFT.symbol()).to.equal('TNC')
      expect(await mockNFT.owner()).to.equal(owner.address)
      
      // Verify MenoMarketplace deployment
      expect(await marketplace.owner()).to.equal(owner.address)
      expect(await marketplace.platformFee()).to.equal(250) // 2.5%
      expect(await marketplace.authorizedMarketplaces(owner.address)).to.be.true
      
      // Verify FiatOffRamp deployment
      expect(await fiatOffRamp.owner()).to.equal(owner.address)
      expect(await fiatOffRamp.authorizedOperators(owner.address)).to.be.true
      
      console.log('✅ All contracts deployed and initialized correctly')
    })
    
    it('Should have correct initial configuration', async function () {
      const { marketplace, fiatOffRamp } = await loadFixture(deployAllContractsFixture)
      
      // Check MenoMarketplace configuration
      expect(await marketplace.platformFee()).to.equal(250)
      expect(await marketplace.MIN_LISTING_DURATION()).to.equal(3600) // 1 hour
      expect(await marketplace.MAX_LISTING_DURATION()).to.equal(2592000) // 30 days
      expect(await marketplace.getCurrentListingId()).to.equal(0)
      
      // Check FiatOffRamp configuration
      expect(await fiatOffRamp.MIN_CONVERSION_AMOUNT()).to.equal(ethers.parseEther('0.01'))
      expect(await fiatOffRamp.MAX_CONVERSION_AMOUNT()).to.equal(ethers.parseEther('100'))
      expect(await fiatOffRamp.REQUEST_TIMEOUT()).to.equal(86400) // 24 hours
      
      console.log('✅ Initial configuration verified')
    })
    
    it('Should verify contract interfaces', async function () {
      const { mockNFT, marketplace, fiatOffRamp } = await loadFixture(deployAllContractsFixture)
      
      // Check ERC721 interface
      expect(await mockNFT.supportsInterface('0x80ac58cd')).to.be.true // ERC721
      expect(await mockNFT.supportsInterface('0x5b5e139f')).to.be.true // ERC721Metadata
      
      // Check contract addresses are valid
      expect(ethers.isAddress(mockNFT.target)).to.be.true
      expect(ethers.isAddress(marketplace.target)).to.be.true
      expect(ethers.isAddress(fiatOffRamp.target)).to.be.true
      
      console.log('✅ Contract interfaces verified')
    })
  })
  
  describe('Network-Specific Deployment', function () {
    it('Should handle different network configurations', async function () {
      const network = await ethers.provider.getNetwork()
      const [owner] = await ethers.getSigners()
      
      console.log('Network details:')
      console.log('- Chain ID:', network.chainId.toString())
      console.log('- Network name:', network.name)
      console.log('- Owner balance:', ethers.formatEther(await ethers.provider.getBalance(owner.address)), 'ETH')
      
      // Network-specific checks
      if (network.chainId === 2810n) {
        console.log('✅ Deploying on Morph Holesky Testnet')
        expect(network.chainId).to.equal(2810n)
      } else if (network.chainId === 2818n) {
        console.log('✅ Deploying on Morph Mainnet')
        expect(network.chainId).to.equal(2818n)
      } else if (network.chainId === 31337n) {
        console.log('✅ Deploying on Hardhat local network')
        expect(network.chainId).to.equal(31337n)
      } else {
        console.log('⚠️ Deploying on unknown network:', network.chainId.toString())
      }
      
      // Verify owner has sufficient balance for deployment
      const balance = await ethers.provider.getBalance(owner.address)
      expect(balance).to.be.gt(ethers.parseEther('0.1')) // At least 0.1 ETH for deployment
    })
    
    it('Should estimate deployment costs', async function () {
      const [owner] = await ethers.getSigners()
      
      // Get gas price
      const gasPrice = await ethers.provider.getGasPrice()
      console.log('Current gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei')
      
      // Estimate deployment costs
      const MockNFT = await ethers.getContractFactory('MockERC721')
      const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
      const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp')
      
      // Estimate gas for each contract
      const mockNFTGas = await ethers.provider.estimateGas({
        data: MockNFT.bytecode + MockNFT.interface.encodeDeploy(['Test NFT', 'TNFT', 'https://api.test.com/']).slice(2)
      })
      
      const marketplaceGas = await ethers.provider.estimateGas({
        data: MenoMarketplace.bytecode
      })
      
      const fiatOffRampGas = await ethers.provider.estimateGas({
        data: FiatOffRamp.bytecode
      })
      
      const totalGas = mockNFTGas + marketplaceGas + fiatOffRampGas
      const totalCost = totalGas * gasPrice
      
      console.log('Deployment gas estimates:')
      console.log('- MockERC721:', mockNFTGas.toString())
      console.log('- MenoMarketplace:', marketplaceGas.toString())
      console.log('- FiatOffRamp:', fiatOffRampGas.toString())
      console.log('- Total gas:', totalGas.toString())
      console.log('- Total cost:', ethers.formatEther(totalCost), 'ETH')
      
      // Verify owner has enough balance for deployment
      const ownerBalance = await ethers.provider.getBalance(owner.address)
      expect(ownerBalance).to.be.gt(totalCost)
      
      console.log('✅ Sufficient balance for deployment')
    })
  })
  
  describe('Post-Deployment Configuration', function () {
    async function deployAndConfigureFixture() {
      const { mockNFT, marketplace, fiatOffRamp, owner, operator, provider, user } = await loadFixture(deployAllContractsFixture)
      
      // Configure FiatOffRamp
      await fiatOffRamp.connect(owner).setAuthorizedOperator(operator.address, true)
      await fiatOffRamp.connect(operator).updateKYCStatus(user.address, true, 'basic')
      
      // Add test provider
      await fiatOffRamp.connect(owner).addProvider(
        provider.address,
        'Test Provider',
        ['USD', 'EUR'],
        ['US', 'EU'],
        ethers.parseEther('0.01'),
        ethers.parseEther('10'),
        250,
        ethers.parseEther('0.001')
      )
      
      // Configure marketplace
      await marketplace.connect(owner).setAuthorizedMarketplace(fiatOffRamp.target, true)
      
      return { mockNFT, marketplace, fiatOffRamp, owner, operator, provider, user }
    }
    
    it('Should configure contracts correctly after deployment', async function () {
      const { marketplace, fiatOffRamp, operator, provider, user } = await loadFixture(deployAndConfigureFixture)
      
      // Verify FiatOffRamp configuration
      expect(await fiatOffRamp.authorizedOperators(operator.address)).to.be.true
      
      const userProfile = await fiatOffRamp.getUserProfile(user.address)
      expect(userProfile.isKYCVerified).to.be.true
      expect(userProfile.kycLevel).to.equal('basic')
      
      const providerData = await fiatOffRamp.getProvider(provider.address)
      expect(providerData.name).to.equal('Test Provider')
      expect(providerData.status).to.equal(0) // Active
      
      // Verify marketplace configuration
      expect(await marketplace.authorizedMarketplaces(fiatOffRamp.target)).to.be.true
      
      console.log('✅ Post-deployment configuration completed')
    })
    
    it('Should test end-to-end functionality after deployment', async function () {
      const { mockNFT, marketplace, fiatOffRamp, owner, provider, user } = await loadFixture(deployAndConfigureFixture)
      
      // Mint NFT for testing
      await mockNFT.mint(user.address, 'test-metadata')
      await mockNFT.connect(user).setApprovalForAll(marketplace.target, true)
      
      // Test NFT listing
      const price = ethers.parseEther('1.0')
      const duration = 86400
      
      const listTx = await marketplace.connect(user).listNFT(
        mockNFT.target,
        0,
        price,
        duration,
        true // Enable fiat off-ramp
      )
      
      const listReceipt = await listTx.wait()
      const listEvent = listReceipt.logs.find(log => log.fragment?.name === 'NFTListed')
      expect(listEvent).to.not.be.undefined
      
      const listingId = listEvent.args.listingId
      
      // Verify listing is active
      expect(await marketplace.isListingActive(listingId)).to.be.true
      
      // Test fiat conversion request
      const conversionAmount = ethers.parseEther('0.5')
      const conversionTx = await fiatOffRamp.connect(user).requestFiatConversion(
        conversionAmount,
        'USD',
        'encrypted-bank-details',
        provider.address,
        { value: conversionAmount }
      )
      
      const conversionReceipt = await conversionTx.wait()
      const conversionEvent = conversionReceipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      expect(conversionEvent).to.not.be.undefined
      
      console.log('✅ End-to-end functionality test passed')
    })
  })
  
  describe('Contract Verification Preparation', function () {
    it('Should prepare contract verification data', async function () {
      const { mockNFT, marketplace, fiatOffRamp } = await loadFixture(deployAllContractsFixture)
      
      // Collect contract addresses for verification
      const contractAddresses = {
        MockERC721: mockNFT.target,
        MenoMarketplace: marketplace.target,
        FiatOffRamp: fiatOffRamp.target
      }
      
      console.log('Contract addresses for verification:')
      Object.entries(contractAddresses).forEach(([name, address]) => {
        console.log(`${name}: ${address}`)
      })
      
      // Collect constructor arguments
      const constructorArgs = {
        MockERC721: ['Test NFT Collection', 'TNC', 'https://api.testnft.com/'],
        MenoMarketplace: [],
        FiatOffRamp: []
      }
      
      console.log('Constructor arguments:')
      Object.entries(constructorArgs).forEach(([name, args]) => {
        console.log(`${name}:`, args)
      })
      
      // Verify all addresses are valid
      Object.values(contractAddresses).forEach(address => {
        expect(ethers.isAddress(address)).to.be.true
      })
      
      console.log('✅ Contract verification data prepared')
    })
    
    it('Should check contract bytecode', async function () {
      const { mockNFT, marketplace, fiatOffRamp } = await loadFixture(deployAllContractsFixture)
      
      // Get deployed bytecode
      const mockNFTCode = await ethers.provider.getCode(mockNFT.target)
      const marketplaceCode = await ethers.provider.getCode(marketplace.target)
      const fiatOffRampCode = await ethers.provider.getCode(fiatOffRamp.target)
      
      // Verify contracts have bytecode (not empty)
      expect(mockNFTCode).to.not.equal('0x')
      expect(marketplaceCode).to.not.equal('0x')
      expect(fiatOffRampCode).to.not.equal('0x')
      
      console.log('Contract bytecode sizes:')
      console.log('- MockERC721:', mockNFTCode.length / 2 - 1, 'bytes')
      console.log('- MenoMarketplace:', marketplaceCode.length / 2 - 1, 'bytes')
      console.log('- FiatOffRamp:', fiatOffRampCode.length / 2 - 1, 'bytes')
      
      console.log('✅ Contract bytecode verification passed')
    })
  })
  
  describe('Deployment Security Checks', function () {
    it('Should verify ownership and access controls', async function () {
      const { marketplace, fiatOffRamp, owner } = await loadFixture(deployAllContractsFixture)
      const [, nonOwner] = await ethers.getSigners()
      
      // Verify ownership
      expect(await marketplace.owner()).to.equal(owner.address)
      expect(await fiatOffRamp.owner()).to.equal(owner.address)
      
      // Verify access controls work
      await expect(
        marketplace.connect(nonOwner).updatePlatformFee(500)
      ).to.be.revertedWithCustomError(marketplace, 'OwnableUnauthorizedAccount')
      
      await expect(
        fiatOffRamp.connect(nonOwner).setAuthorizedOperator(nonOwner.address, true)
      ).to.be.revertedWithCustomError(fiatOffRamp, 'OwnableUnauthorizedAccount')
      
      console.log('✅ Ownership and access controls verified')
    })
    
    it('Should check for proper initialization', async function () {
      const { marketplace, fiatOffRamp, owner } = await loadFixture(deployAllContractsFixture)
      
      // Check marketplace initialization
      expect(await marketplace.platformFee()).to.equal(250)
      expect(await marketplace.authorizedMarketplaces(owner.address)).to.be.true
      expect(await marketplace.getCurrentListingId()).to.equal(0)
      
      // Check fiat off-ramp initialization
      expect(await fiatOffRamp.authorizedOperators(owner.address)).to.be.true
      
      // Verify no unexpected state
      const [randomUser] = await ethers.getSigners()
      expect(await marketplace.sellerProceeds(randomUser.address)).to.equal(0)
      
      const userProfile = await fiatOffRamp.getUserProfile(randomUser.address)
      expect(userProfile.isKYCVerified).to.be.false
      expect(userProfile.totalConverted).to.equal(0)
      
      console.log('✅ Proper initialization verified')
    })
  })
})