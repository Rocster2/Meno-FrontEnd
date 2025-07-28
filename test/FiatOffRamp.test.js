const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('FiatOffRamp', function () {
  // Fixture to deploy contracts and setup initial state
  async function deployFiatOffRampFixture() {
    const [owner, user1, user2, provider1, provider2, operator] = await ethers.getSigners()
    
    // Deploy FiatOffRamp contract
    const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp')
    const fiatOffRamp = await FiatOffRamp.deploy()
    
    // Set up operator
    await fiatOffRamp.connect(owner).setAuthorizedOperator(operator.address, true)
    
    // Set up KYC for users
    await fiatOffRamp.connect(operator).updateKYCStatus(user1.address, true, 'basic')
    await fiatOffRamp.connect(operator).updateKYCStatus(user2.address, true, 'enhanced')
    
    return {
      fiatOffRamp,
      owner,
      user1,
      user2,
      provider1,
      provider2,
      operator
    }
  }
  
  async function deployWithProvidersFixture() {
    const fixture = await loadFixture(deployFiatOffRampFixture)
    const { fiatOffRamp, owner, provider1, provider2 } = fixture
    
    // Add test providers
    await fiatOffRamp.connect(owner).addProvider(
      provider1.address,
      'Test Provider 1',
      ['USD', 'EUR'],
      ['US', 'EU'],
      ethers.parseEther('0.01'), // min amount
      ethers.parseEther('10'),   // max amount
      250, // 2.5% fee
      ethers.parseEther('0.001') // fixed fee
    )
    
    await fiatOffRamp.connect(owner).addProvider(
      provider2.address,
      'Test Provider 2',
      ['USD', 'GBP'],
      ['US', 'GB'],
      ethers.parseEther('0.05'), // min amount
      ethers.parseEther('5'),    // max amount
      300, // 3% fee
      ethers.parseEther('0.002') // fixed fee
    )
    
    return fixture
  }
  
  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { fiatOffRamp, owner } = await loadFixture(deployFiatOffRampFixture)
      expect(await fiatOffRamp.owner()).to.equal(owner.address)
    })
    
    it('Should authorize owner as operator', async function () {
      const { fiatOffRamp, owner } = await loadFixture(deployFiatOffRampFixture)
      expect(await fiatOffRamp.authorizedOperators(owner.address)).to.be.true
    })
  })
  
  describe('Provider Management', function () {
    it('Should add provider successfully', async function () {
      const { fiatOffRamp, owner, provider1 } = await loadFixture(deployFiatOffRampFixture)
      
      await expect(
        fiatOffRamp.connect(owner).addProvider(
          provider1.address,
          'Test Provider',
          ['USD', 'EUR'],
          ['US', 'EU'],
          ethers.parseEther('0.01'),
          ethers.parseEther('10'),
          250,
          ethers.parseEther('0.001')
        )
      ).to.emit(fiatOffRamp, 'ProviderAdded')
        .withArgs(provider1.address, 'Test Provider')
      
      const provider = await fiatOffRamp.getProvider(provider1.address)
      expect(provider.name).to.equal('Test Provider')
      expect(provider.status).to.equal(0) // Active
    })
    
    it('Should fail to add provider with invalid parameters', async function () {
      const { fiatOffRamp, owner, provider1 } = await loadFixture(deployFiatOffRampFixture)
      
      // Invalid address
      await expect(
        fiatOffRamp.connect(owner).addProvider(
          ethers.ZeroAddress,
          'Test Provider',
          ['USD'],
          ['US'],
          ethers.parseEther('0.01'),
          ethers.parseEther('10'),
          250,
          ethers.parseEther('0.001')
        )
      ).to.be.revertedWith('Invalid provider address')
      
      // Fee too high
      await expect(
        fiatOffRamp.connect(owner).addProvider(
          provider1.address,
          'Test Provider',
          ['USD'],
          ['US'],
          ethers.parseEther('0.01'),
          ethers.parseEther('10'),
          1001, // 10.01%
          ethers.parseEther('0.001')
        )
      ).to.be.revertedWith('Fee percentage too high')
    })
    
    it('Should update provider status', async function () {
      const { fiatOffRamp, owner, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      await expect(
        fiatOffRamp.connect(owner).updateProviderStatus(provider1.address, 2) // Maintenance
      ).to.emit(fiatOffRamp, 'ProviderUpdated')
        .withArgs(provider1.address, 2)
      
      const provider = await fiatOffRamp.getProvider(provider1.address)
      expect(provider.status).to.equal(2) // Maintenance
    })
  })
  
  describe('KYC Management', function () {
    it('Should update KYC status', async function () {
      const { fiatOffRamp, operator, user1 } = await loadFixture(deployFiatOffRampFixture)
      
      await expect(
        fiatOffRamp.connect(operator).updateKYCStatus(user1.address, true, 'enhanced')
      ).to.emit(fiatOffRamp, 'KYCStatusUpdated')
        .withArgs(user1.address, true, 'enhanced')
      
      const profile = await fiatOffRamp.getUserProfile(user1.address)
      expect(profile.isKYCVerified).to.be.true
      expect(profile.kycLevel).to.equal('enhanced')
    })
    
    it('Should blacklist user', async function () {
      const { fiatOffRamp, owner, user1 } = await loadFixture(deployFiatOffRampFixture)
      
      await fiatOffRamp.connect(owner).setUserBlacklist(user1.address, true)
      
      const profile = await fiatOffRamp.getUserProfile(user1.address)
      expect(profile.isBlacklisted).to.be.true
    })
  })
  
  describe('Fiat Conversion Requests', function () {
    it('Should create conversion request successfully', async function () {
      const { fiatOffRamp, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      const amount = ethers.parseEther('1.0')
      const currency = 'USD'
      const bankDetails = 'encrypted-bank-details'
      
      await expect(
        fiatOffRamp.connect(user1).requestFiatConversion(
          amount,
          currency,
          bankDetails,
          provider1.address,
          { value: amount }
        )
      ).to.emit(fiatOffRamp, 'ConversionRequested')
      
      const userRequests = await fiatOffRamp.getUserRequests(user1.address)
      expect(userRequests.length).to.equal(1)
      
      const request = await fiatOffRamp.getConversionRequest(userRequests[0])
      expect(request.user).to.equal(user1.address)
      expect(request.amount).to.equal(amount)
      expect(request.currency).to.equal(currency)
      expect(request.status).to.equal(0) // Pending
    })
    
    it('Should fail without KYC verification', async function () {
      const { fiatOffRamp, provider1 } = await loadFixture(deployWithProvidersFixture)
      const [, , , unverifiedUser] = await ethers.getSigners()
      
      const amount = ethers.parseEther('1.0')
      
      await expect(
        fiatOffRamp.connect(unverifiedUser).requestFiatConversion(
          amount,
          'USD',
          'bank-details',
          provider1.address,
          { value: amount }
        )
      ).to.be.revertedWith('KYC verification required')
    })
    
    it('Should fail with blacklisted user', async function () {
      const { fiatOffRamp, owner, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      // Blacklist user
      await fiatOffRamp.connect(owner).setUserBlacklist(user1.address, true)
      
      const amount = ethers.parseEther('1.0')
      
      await expect(
        fiatOffRamp.connect(user1).requestFiatConversion(
          amount,
          'USD',
          'bank-details',
          provider1.address,
          { value: amount }
        )
      ).to.be.revertedWith('User is blacklisted')
    })
    
    it('Should fail with invalid amount', async function () {
      const { fiatOffRamp, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      const tooSmallAmount = ethers.parseEther('0.005') // Below MIN_CONVERSION_AMOUNT
      
      await expect(
        fiatOffRamp.connect(user1).requestFiatConversion(
          tooSmallAmount,
          'USD',
          'bank-details',
          provider1.address,
          { value: tooSmallAmount }
        )
      ).to.be.revertedWith('Invalid amount')
    })
    
    it('Should fail with mismatched sent value', async function () {
      const { fiatOffRamp, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      const amount = ethers.parseEther('1.0')
      const sentValue = ethers.parseEther('0.5')
      
      await expect(
        fiatOffRamp.connect(user1).requestFiatConversion(
          amount,
          'USD',
          'bank-details',
          provider1.address,
          { value: sentValue }
        )
      ).to.be.revertedWith('Sent value must match amount')
    })
  })
  
  describe('Provider Assignment', function () {
    async function createRequestFixture() {
      const fixture = await loadFixture(deployWithProvidersFixture)
      const { fiatOffRamp, user1, provider1 } = fixture
      
      const amount = ethers.parseEther('1.0')
      const tx = await fiatOffRamp.connect(user1).requestFiatConversion(
        amount,
        'USD',
        'encrypted-bank-details',
        provider1.address,
        { value: amount }
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      const requestId = event.args.requestId
      
      return { ...fixture, requestId, amount }
    }
    
    it('Should assign provider successfully', async function () {
      const { fiatOffRamp, operator, provider1, requestId } = await loadFixture(createRequestFixture)
      
      const exchangeRate = ethers.parseEther('2000') // 1 ETH = 2000 USD
      const fees = ethers.parseEther('0.025') // 2.5% of 1 ETH
      
      await expect(
        fiatOffRamp.connect(operator).assignProvider(requestId, provider1.address, exchangeRate, fees)
      ).to.emit(fiatOffRamp, 'ConversionAssigned')
        .withArgs(requestId, provider1.address, exchangeRate, ethers.parseEther('2000'), fees)
      
      const request = await fiatOffRamp.getConversionRequest(requestId)
      expect(request.assignedProvider).to.equal(provider1.address)
      expect(request.status).to.equal(1) // Processing
      expect(request.exchangeRate).to.equal(exchangeRate)
    })
    
    it('Should fail to assign inactive provider', async function () {
      const { fiatOffRamp, owner, operator, provider1, requestId } = await loadFixture(createRequestFixture)
      
      // Deactivate provider
      await fiatOffRamp.connect(owner).updateProviderStatus(provider1.address, 1) // Inactive
      
      const exchangeRate = ethers.parseEther('2000')
      const fees = ethers.parseEther('0.025')
      
      await expect(
        fiatOffRamp.connect(operator).assignProvider(requestId, provider1.address, exchangeRate, fees)
      ).to.be.revertedWith('Provider not active')
    })
  })
  
  describe('Conversion Processing', function () {
    async function assignedRequestFixture() {
      const fixture = await loadFixture(createRequestFixture)
      const { fiatOffRamp, operator, provider1, requestId } = fixture
      
      const exchangeRate = ethers.parseEther('2000')
      const fees = ethers.parseEther('0.025')
      
      await fiatOffRamp.connect(operator).assignProvider(requestId, provider1.address, exchangeRate, fees)
      
      return { ...fixture, exchangeRate, fees }
    }
    
    it('Should complete conversion successfully', async function () {
      const { fiatOffRamp, provider1, user1, requestId, amount } = await loadFixture(assignedRequestFixture)
      
      await expect(
        fiatOffRamp.connect(provider1).completeConversion(requestId)
      ).to.emit(fiatOffRamp, 'ConversionCompleted')
        .withArgs(requestId, user1.address, provider1.address, amount, ethers.parseEther('2000'))
      
      const request = await fiatOffRamp.getConversionRequest(requestId)
      expect(request.status).to.equal(2) // Completed
      
      const provider = await fiatOffRamp.getProvider(provider1.address)
      expect(provider.successfulConversions).to.equal(1)
      expect(provider.totalProcessed).to.equal(amount)
    })
    
    it('Should fail conversion with reason', async function () {
      const { fiatOffRamp, provider1, user1, requestId } = await loadFixture(assignedRequestFixture)
      
      const failureReason = 'Bank account verification failed'
      
      await expect(
        fiatOffRamp.connect(provider1).failConversion(requestId, failureReason)
      ).to.emit(fiatOffRamp, 'ConversionFailed')
        .withArgs(requestId, user1.address, provider1.address, failureReason)
      
      const request = await fiatOffRamp.getConversionRequest(requestId)
      expect(request.status).to.equal(3) // Failed
      expect(request.failureReason).to.equal(failureReason)
      
      const provider = await fiatOffRamp.getProvider(provider1.address)
      expect(provider.failedConversions).to.equal(1)
    })
    
    it('Should fail if not assigned provider', async function () {
      const { fiatOffRamp, provider2, requestId } = await loadFixture(assignedRequestFixture)
      
      await expect(
        fiatOffRamp.connect(provider2).completeConversion(requestId)
      ).to.be.revertedWith('Not assigned provider')
    })
  })
  
  describe('Conversion Cancellation', function () {
    async function createRequestFixture() {
      const fixture = await loadFixture(deployWithProvidersFixture)
      const { fiatOffRamp, user1, provider1 } = fixture
      
      const amount = ethers.parseEther('1.0')
      const tx = await fiatOffRamp.connect(user1).requestFiatConversion(
        amount,
        'USD',
        'encrypted-bank-details',
        provider1.address,
        { value: amount }
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      const requestId = event.args.requestId
      
      return { ...fixture, requestId, amount }
    }
    
    it('Should cancel pending request', async function () {
      const { fiatOffRamp, user1, requestId } = await loadFixture(createRequestFixture)
      
      const initialBalance = await ethers.provider.getBalance(user1.address)
      
      await expect(
        fiatOffRamp.connect(user1).cancelConversion(requestId)
      ).to.emit(fiatOffRamp, 'ConversionCancelled')
        .withArgs(requestId, user1.address)
      
      const request = await fiatOffRamp.getConversionRequest(requestId)
      expect(request.status).to.equal(4) // Cancelled
      
      // User should receive refund
      const finalBalance = await ethers.provider.getBalance(user1.address)
      expect(finalBalance).to.be.gt(initialBalance)
    })
    
    it('Should fail to cancel completed request', async function () {
      const { fiatOffRamp, operator, provider1, user1, requestId } = await loadFixture(createRequestFixture)
      
      // Assign and complete the request
      const exchangeRate = ethers.parseEther('2000')
      const fees = ethers.parseEther('0.025')
      
      await fiatOffRamp.connect(operator).assignProvider(requestId, provider1.address, exchangeRate, fees)
      await fiatOffRamp.connect(provider1).completeConversion(requestId)
      
      await expect(
        fiatOffRamp.connect(user1).cancelConversion(requestId)
      ).to.be.revertedWith('Cannot cancel completed request')
    })
  })
  
  describe('Admin Functions', function () {
    it('Should set authorized operator', async function () {
      const { fiatOffRamp, owner, user1 } = await loadFixture(deployFiatOffRampFixture)
      
      await fiatOffRamp.connect(owner).setAuthorizedOperator(user1.address, true)
      expect(await fiatOffRamp.authorizedOperators(user1.address)).to.be.true
      
      await fiatOffRamp.connect(owner).setAuthorizedOperator(user1.address, false)
      expect(await fiatOffRamp.authorizedOperators(user1.address)).to.be.false
    })
    
    it('Should emergency withdraw', async function () {
      const { fiatOffRamp, owner, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      // Create a request to add funds to contract
      const amount = ethers.parseEther('1.0')
      await fiatOffRamp.connect(user1).requestFiatConversion(
        amount,
        'USD',
        'bank-details',
        provider1.address,
        { value: amount }
      )
      
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address)
      const contractBalance = await ethers.provider.getBalance(fiatOffRamp.target)
      
      const tx = await fiatOffRamp.connect(owner).emergencyWithdraw()
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed * receipt.gasPrice
      
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address)
      const expectedBalance = initialOwnerBalance + contractBalance - gasUsed
      
      expect(finalOwnerBalance).to.be.closeTo(expectedBalance, ethers.parseEther('0.001'))
    })
    
    it('Should expire old requests', async function () {
      const { fiatOffRamp, operator, user1, provider1 } = await loadFixture(deployWithProvidersFixture)
      
      const amount = ethers.parseEther('1.0')
      const tx = await fiatOffRamp.connect(user1).requestFiatConversion(
        amount,
        'USD',
        'bank-details',
        provider1.address,
        { value: amount }
      )
      
      const receipt = await tx.wait()
      const event = receipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
      const requestId = event.args.requestId
      
      // Fast forward time beyond timeout
      await time.increase(86401) // 24 hours + 1 second
      
      await fiatOffRamp.connect(operator).expireRequest(requestId)
      
      const request = await fiatOffRamp.getConversionRequest(requestId)
      expect(request.status).to.equal(5) // Expired
    })
  })
  
  describe('View Functions', function () {
    it('Should get providers for currency', async function () {
      const { fiatOffRamp } = await loadFixture(deployWithProvidersFixture)
      
      const usdProviders = await fiatOffRamp.getProvidersForCurrency('USD')
      expect(usdProviders.length).to.equal(2)
      
      const gbpProviders = await fiatOffRamp.getProvidersForCurrency('GBP')
      expect(gbpProviders.length).to.equal(1)
    })
    
    it('Should get all providers', async function () {
      const { fiatOffRamp } = await loadFixture(deployWithProvidersFixture)
      
      const allProviders = await fiatOffRamp.getAllProviders()
      expect(allProviders.length).to.equal(2)
    })
  })
})

// Helper function to create request fixture
async function createRequestFixture() {
  const fixture = await loadFixture(deployWithProvidersFixture)
  const { fiatOffRamp, user1, provider1 } = fixture
  
  const amount = ethers.parseEther('1.0')
  const tx = await fiatOffRamp.connect(user1).requestFiatConversion(
    amount,
    'USD',
    'encrypted-bank-details',
    provider1.address,
    { value: amount }
  )
  
  const receipt = await tx.wait()
  const event = receipt.logs.find(log => log.fragment?.name === 'ConversionRequested')
  const requestId = event.args.requestId
  
  return { ...fixture, requestId, amount }
}