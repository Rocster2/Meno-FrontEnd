/**
 * TransactionProcessor - Fiat conversion transaction processing
 * Core flow: NFT Sale → Bridge to USDC → Fiat Off-ramp
 */

// Browser-compatible EventEmitter
const EventEmitter = typeof window !== 'undefined' ? require('events').EventEmitter : class EventEmitter {
  constructor() {
    this.events = {}
  }
  on(event, listener) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(listener)
  }
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
}
import { parseEther, formatEther } from 'viem'

class TransactionProcessor extends EventEmitter {
  constructor(providerAggregator, complianceService) {
    super()
    this.providerAggregator = providerAggregator
    this.complianceService = complianceService
    this.activeTransactions = new Map()
    this.transactionHistory = new Map()
    
    // Configuration
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      transactionTimeout: 600000, // 10 minutes
      bridgeSlippage: 0.5, // 0.5%
      minBridgeAmount: parseEther('0.01'), // 0.01 ETH
      maxBridgeAmount: parseEther('100') // 100 ETH
    }
    
    // Statistics
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalVolumeProcessed: 0,
      averageProcessingTime: 0,
      activeTransactionCount: 0
    }
  }

  /**
   * Initialize the transaction processor
   */
  async initialize() {
    console.log('💰 Initializing TransactionProcessor...')
    
    // Start cleanup interval for expired transactions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTransactions()
    }, 60000) // Every minute
    
    console.log('✅ TransactionProcessor initialized')
    this.emit('initialized')
  }

  /**
   * Process complete NFT to fiat conversion
   * Flow: NFT Sale → ETH → Bridge to USDC → Fiat Off-ramp
   */
  async processNFTToFiatConversion(transactionData) {
    const {
      userAddress,
      nftSaleAmount, // ETH amount from NFT sale
      targetCurrency = 'USD',
      targetCountry = 'US',
      bankDetails,
      preferredProvider = null
    } = transactionData
    
    const transactionId = this.generateTransactionId()
    
    try {
      console.log(`🚀 Starting NFT to fiat conversion: ${transactionId}`)
      
      // Create transaction record
      const transaction = {
        id: transactionId,
        userAddress,
        type: 'nft_to_fiat',
        status: 'initiated',
        steps: {
          validation: { status: 'pending' },
          bridging: { status: 'pending' },
          fiatConversion: { status: 'pending' }
        },
        amounts: {
          nftSaleETH: nftSaleAmount,
          bridgedUSDC: null,
          fiatAmount: null
        },
        targetCurrency,
        targetCountry,
        bankDetails,
        preferredProvider,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      this.activeTransactions.set(transactionId, transaction)
      this.stats.totalTransactions++
      this.stats.activeTransactionCount++
      
      this.emit('transactionStarted', transaction)
      
      // Step 1: Validate transaction
      await this.validateTransaction(transaction)
      
      // Step 2: Bridge ETH to USDC
      await this.bridgeToStablecoin(transaction)
      
      // Step 3: Convert USDC to fiat
      await this.convertToFiat(transaction)
      
      // Mark as completed
      transaction.status = 'completed'
      transaction.completedAt = Date.now()
      
      this.finalizeTransaction(transaction)
      
      console.log(`✅ NFT to fiat conversion completed: ${transactionId}`)
      return transaction
      
    } catch (error) {
      console.error(`❌ NFT to fiat conversion failed: ${transactionId}`, error)
      await this.handleTransactionError(transactionId, error)
      throw error
    }
  }

  /**
   * Step 1: Validate transaction
   */
  async validateTransaction(transaction) {
    console.log(`🔍 Validating transaction: ${transaction.id}`)
    
    transaction.steps.validation.status = 'processing'
    transaction.steps.validation.startedAt = Date.now()
    
    try {
      // Compliance validation (simplified - no KYC)
      const validation = await this.complianceService.validateTransaction(
        transaction.userAddress,
        {
          amount: parseFloat(formatEther(transaction.amounts.nftSaleETH)) * 2000, // Estimate USD
          currency: transaction.targetCurrency,
          type: 'nft_offramp'
        }
      )
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }
      
      // Check bridge amount limits
      if (transaction.amounts.nftSaleETH < this.config.minBridgeAmount) {
        throw new Error(`Amount below minimum bridge limit: ${formatEther(this.config.minBridgeAmount)} ETH`)
      }
      
      if (transaction.amounts.nftSaleETH > this.config.maxBridgeAmount) {
        throw new Error(`Amount exceeds maximum bridge limit: ${formatEther(this.config.maxBridgeAmount)} ETH`)
      }
      
      transaction.steps.validation.status = 'completed'
      transaction.steps.validation.completedAt = Date.now()
      transaction.validation = validation
      
      this.emit('validationCompleted', transaction)
      
    } catch (error) {
      transaction.steps.validation.status = 'failed'
      transaction.steps.validation.error = error.message
      throw error
    }
  }

  /**
   * Step 2: Bridge ETH to USDC (using Rubic or similar)
   */
  async bridgeToStablecoin(transaction) {
    console.log(`🌉 Bridging to stablecoin: ${transaction.id}`)
    
    transaction.steps.bridging.status = 'processing'
    transaction.steps.bridging.startedAt = Date.now()
    
    try {
      // Simulate bridge operation (in production, integrate with Rubic SDK)
      const ethAmount = parseFloat(formatEther(transaction.amounts.nftSaleETH))
      const ethToUsdRate = 2000 // Simplified rate
      const slippageAmount = ethAmount * ethToUsdRate * (this.config.bridgeSlippage / 100)
      const usdcAmount = (ethAmount * ethToUsdRate) - slippageAmount
      
      // Simulate bridge delay
      await this.delay(3000) // 3 seconds
      
      transaction.amounts.bridgedUSDC = usdcAmount
      transaction.steps.bridging.status = 'completed'
      transaction.steps.bridging.completedAt = Date.now()
      transaction.steps.bridging.bridgeRate = ethToUsdRate
      transaction.steps.bridging.slippage = this.config.bridgeSlippage
      
      console.log(`✅ Bridged ${ethAmount} ETH to ${usdcAmount} USDC`)
      this.emit('bridgingCompleted', transaction)
      
    } catch (error) {
      transaction.steps.bridging.status = 'failed'
      transaction.steps.bridging.error = error.message
      throw error
    }
  }

  /**
   * Step 3: Convert USDC to fiat
   */
  async convertToFiat(transaction) {
    console.log(`💱 Converting to fiat: ${transaction.id}`)
    
    transaction.steps.fiatConversion.status = 'processing'
    transaction.steps.fiatConversion.startedAt = Date.now()
    
    try {
      // Get best rates from provider aggregator
      const rates = await this.providerAggregator.getBestRates(
        transaction.amounts.bridgedUSDC,
        'USDC',
        transaction.targetCurrency,
        transaction.targetCountry
      )
      
      if (!rates.bestRate) {
        throw new Error('No available providers for fiat conversion')
      }
      
      // Select optimal provider
      const selectedProvider = this.providerAggregator.selectOptimalProvider(rates, {
        prioritize: 'net_amount',
        maxFeePercentage: 5,
        maxProcessingTime: 1800 // 30 minutes
      })
      
      if (!selectedProvider) {
        throw new Error('No suitable provider found for conversion')
      }
      
      // Execute fiat conversion
      const conversionResult = await this.executeFiatConversion(
        transaction,
        selectedProvider
      )
      
      transaction.amounts.fiatAmount = conversionResult.fiatAmount
      transaction.steps.fiatConversion.status = 'completed'
      transaction.steps.fiatConversion.completedAt = Date.now()
      transaction.steps.fiatConversion.provider = selectedProvider.provider
      transaction.steps.fiatConversion.exchangeRate = selectedProvider.rate.exchangeRate
      transaction.steps.fiatConversion.fees = selectedProvider.rate.totalFees
      
      console.log(`✅ Converted ${transaction.amounts.bridgedUSDC} USDC to ${conversionResult.fiatAmount} ${transaction.targetCurrency}`)
      this.emit('fiatConversionCompleted', transaction)
      
    } catch (error) {
      transaction.steps.fiatConversion.status = 'failed'
      transaction.steps.fiatConversion.error = error.message
      throw error
    }
  }  
/**
   * Execute fiat conversion with selected provider
   */
  async executeFiatConversion(transaction, selectedProvider) {
    const { provider, rate } = selectedProvider
    
    console.log(`💳 Executing conversion with ${provider.name}`)
    
    // Simulate provider-specific conversion
    // In production, integrate with actual provider APIs
    const conversionData = {
      amount: transaction.amounts.bridgedUSDC,
      fromCurrency: 'USDC',
      toCurrency: transaction.targetCurrency,
      bankDetails: transaction.bankDetails,
      exchangeRate: rate.exchangeRate,
      fees: rate.totalFees
    }
    
    // Simulate processing time
    await this.delay(provider.tier === 1 ? 2000 : 5000)
    
    const fiatAmount = transaction.amounts.bridgedUSDC * rate.exchangeRate - rate.totalFees
    
    return {
      fiatAmount,
      transactionId: `${provider.id}_${Date.now()}`,
      estimatedArrival: Date.now() + (rate.processingTime * 1000),
      provider: provider.name
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    const transaction = this.activeTransactions.get(transactionId) || 
                       this.transactionHistory.get(transactionId)
    
    if (!transaction) {
      return { error: 'Transaction not found' }
    }
    
    return {
      id: transaction.id,
      status: transaction.status,
      steps: transaction.steps,
      amounts: transaction.amounts,
      progress: this.calculateProgress(transaction),
      estimatedCompletion: this.estimateCompletion(transaction),
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }
  }

  /**
   * Calculate transaction progress percentage
   */
  calculateProgress(transaction) {
    const steps = Object.values(transaction.steps)
    const completedSteps = steps.filter(step => step.status === 'completed').length
    const totalSteps = steps.length
    
    if (transaction.status === 'completed') return 100
    if (transaction.status === 'failed') return 0
    
    return Math.round((completedSteps / totalSteps) * 100)
  }

  /**
   * Estimate completion time
   */
  estimateCompletion(transaction) {
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return null
    }
    
    const averageStepTime = 30000 // 30 seconds per step
    const remainingSteps = Object.values(transaction.steps)
      .filter(step => step.status === 'pending').length
    
    return Date.now() + (remainingSteps * averageStepTime)
  }

  /**
   * Handle transaction error
   */
  async handleTransactionError(transactionId, error) {
    const transaction = this.activeTransactions.get(transactionId)
    if (!transaction) return
    
    transaction.status = 'failed'
    transaction.error = error.message
    transaction.failedAt = Date.now()
    
    this.stats.failedTransactions++
    this.stats.activeTransactionCount--
    
    // Move to history
    this.transactionHistory.set(transactionId, transaction)
    this.activeTransactions.delete(transactionId)
    
    this.emit('transactionFailed', { transaction, error })
    
    console.error(`💀 Transaction failed: ${transactionId} - ${error.message}`)
  }

  /**
   * Finalize successful transaction
   */
  finalizeTransaction(transaction) {
    const processingTime = Date.now() - transaction.createdAt
    
    // Update statistics
    this.stats.successfulTransactions++
    this.stats.activeTransactionCount--
    this.stats.totalVolumeProcessed += transaction.amounts.fiatAmount || 0
    
    // Update average processing time
    if (this.stats.averageProcessingTime === 0) {
      this.stats.averageProcessingTime = processingTime
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime + processingTime) / 2
    }
    
    // Move to history
    this.transactionHistory.set(transaction.id, transaction)
    this.activeTransactions.delete(transaction.id)
    
    this.emit('transactionCompleted', transaction)
  }

  /**
   * Get user's transaction history
   */
  getUserTransactions(userAddress, limit = 50) {
    const allTransactions = [
      ...Array.from(this.activeTransactions.values()),
      ...Array.from(this.transactionHistory.values())
    ]
    
    return allTransactions
      .filter(tx => tx.userAddress === userAddress)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(transactionId) {
    const transaction = this.transactionHistory.get(transactionId)
    
    if (!transaction || transaction.status !== 'failed') {
      throw new Error('Transaction not found or not in failed state')
    }
    
    // Create new transaction with same data
    const retryData = {
      userAddress: transaction.userAddress,
      nftSaleAmount: transaction.amounts.nftSaleETH,
      targetCurrency: transaction.targetCurrency,
      targetCountry: transaction.targetCountry,
      bankDetails: transaction.bankDetails,
      preferredProvider: transaction.preferredProvider
    }
    
    return this.processNFTToFiatConversion(retryData)
  }

  /**
   * Cancel active transaction
   */
  async cancelTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      throw new Error('Transaction not found or already completed')
    }
    
    transaction.status = 'cancelled'
    transaction.cancelledAt = Date.now()
    
    this.stats.activeTransactionCount--
    
    // Move to history
    this.transactionHistory.set(transactionId, transaction)
    this.activeTransactions.delete(transactionId)
    
    this.emit('transactionCancelled', transaction)
    
    console.log(`❌ Transaction cancelled: ${transactionId}`)
    return transaction
  }

  /**
   * Clean up expired transactions
   */
  cleanupExpiredTransactions() {
    const now = Date.now()
    const expiredTransactions = []
    
    for (const [id, transaction] of this.activeTransactions) {
      if (now - transaction.createdAt > this.config.transactionTimeout) {
        expiredTransactions.push(id)
      }
    }
    
    for (const id of expiredTransactions) {
      this.handleTransactionError(id, new Error('Transaction timeout'))
    }
    
    if (expiredTransactions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredTransactions.length} expired transactions`)
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalTransactions > 0 ? 
        (this.stats.successfulTransactions / this.stats.totalTransactions) * 100 : 0,
      activeTransactions: Array.from(this.activeTransactions.keys()),
      totalHistoryRecords: this.transactionHistory.size
    }
  }

  /**
   * Stop the transaction processor
   */
  async stop() {
    console.log('🛑 Stopping TransactionProcessor...')
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Cancel all active transactions
    const activeIds = Array.from(this.activeTransactions.keys())
    for (const id of activeIds) {
      await this.cancelTransaction(id)
    }
    
    console.log('✅ TransactionProcessor stopped')
    this.emit('stopped')
  }
}

export default TransactionProcessor