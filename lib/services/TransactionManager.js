/**
 * Transaction Manager
 * Handles all blockchain transactions with proper error handling, monitoring, and retry logic
 */

import { createPublicClient, createWalletClient, http, custom } from 'viem'
import { getCurrentNetwork, getTransactionUrl } from '../network-config'
import EventEmitter from 'events'

class TransactionManager extends EventEmitter {
  constructor() {
    super()
    this.publicClient = null
    this.walletClient = null
    this.transactions = new Map() // txHash -> transaction data
    this.pendingTransactions = new Set()
    this.retryQueue = []
    this.gasTracker = new Map() // network -> gas data
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
    
    // Transaction statistics
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      totalGasUsed: 0n,
      averageGasPrice: 0n
    }
    
    this.initializeClients()
    this.startMonitoring()
  }

  /**
   * Initialize blockchain clients
   */
  initializeClients() {
    const network = getCurrentNetwork()
    
    this.publicClient = createPublicClient({
      chain: network,
      transport: http(network.rpcUrls.default.http[0])
    })
    
    // Wallet client will be initialized when needed with user's wallet
    console.log('🔧 Transaction manager clients initialized')
  }

  /**
   * Initialize wallet client with user's wallet
   */
  async initializeWalletClient(walletProvider) {
    try {
      const network = getCurrentNetwork()
      
      this.walletClient = createWalletClient({
        chain: network,
        transport: custom(walletProvider)
      })
      
      console.log('👛 Wallet client initialized')
      return true
      
    } catch (error) {
      console.error('❌ Failed to initialize wallet client:', error)
      return false
    }
  }

  /**
   * Execute a transaction with comprehensive error handling
   */
  async executeTransaction(transactionRequest) {
    const txId = this.generateTransactionId()
    
    try {
      console.log(`🚀 Executing transaction ${txId}:`, transactionRequest.type)
      
      // Validate transaction request
      this.validateTransactionRequest(transactionRequest)
      
      // Create transaction record
      const transaction = {
        id: txId,
        type: transactionRequest.type,
        status: 'preparing',
        request: transactionRequest,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        gasEstimate: null,
        gasUsed: null,
        gasPrice: null,
        hash: null,
        receipt: null,
        error: null,
        retryCount: 0
      }
      
      this.transactions.set(txId, transaction)
      this.emit('transactionCreated', transaction)
      
      // Estimate gas
      await this.estimateGas(transaction)
      
      // Optimize gas price
      await this.optimizeGasPrice(transaction)
      
      // Execute transaction
      const result = await this.sendTransaction(transaction)
      
      // Monitor transaction
      this.monitorTransaction(transaction)
      
      return {
        transactionId: txId,
        hash: result.hash,
        status: 'pending'
      }
      
    } catch (error) {
      console.error(`❌ Transaction ${txId} failed:`, error)
      
      const transaction = this.transactions.get(txId)
      if (transaction) {
        transaction.status = 'failed'
        transaction.error = error.message
        transaction.updatedAt = new Date()
        this.emit('transactionFailed', transaction)
      }
      
      throw error
    }
  }

  /**
   * Validate transaction request
   */
  validateTransactionRequest(request) {
    if (!request.type) {
      throw new Error('Transaction type is required')
    }
    
    if (!request.to) {
      throw new Error('Transaction recipient is required')
    }
    
    if (!request.data && !request.value) {
      throw new Error('Transaction must have either data or value')
    }
    
    // Type-specific validation
    switch (request.type) {
      case 'nft_listing':
        this.validateNFTListingRequest(request)
        break
      case 'nft_purchase':
        this.validateNFTPurchaseRequest(request)
        break
      case 'fiat_conversion':
        this.validateFiatConversionRequest(request)
        break
      default:
        console.warn(`⚠️ Unknown transaction type: ${request.type}`)
    }
  }

  /**
   * Validate NFT listing request
   */
  validateNFTListingRequest(request) {
    if (!request.nftContract || !request.tokenId) {
      throw new Error('NFT contract and token ID are required for listing')
    }
    
    if (!request.price || request.price <= 0) {
      throw new Error('Valid price is required for listing')
    }
  }

  /**
   * Validate NFT purchase request
   */
  validateNFTPurchaseRequest(request) {
    if (!request.listingId) {
      throw new Error('Listing ID is required for purchase')
    }
    
    if (!request.value || request.value <= 0) {
      throw new Error('Valid payment amount is required for purchase')
    }
  }

  /**
   * Validate fiat conversion request
   */
  validateFiatConversionRequest(request) {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Valid amount is required for fiat conversion')
    }
    
    if (!request.currency) {
      throw new Error('Target currency is required for fiat conversion')
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(transaction) {
    try {
      transaction.status = 'estimating_gas'
      this.emit('transactionUpdated', transaction)
      
      const gasEstimate = await this.publicClient.estimateGas({
        to: transaction.request.to,
        data: transaction.request.data,
        value: transaction.request.value,
        account: transaction.request.from
      })
      
      // Add 20% buffer for gas estimate
      transaction.gasEstimate = gasEstimate + (gasEstimate * 20n / 100n)
      
      console.log(`⛽ Gas estimated for ${transaction.id}: ${transaction.gasEstimate}`)
      
    } catch (error) {
      console.error(`❌ Gas estimation failed for ${transaction.id}:`, error)
      throw new Error(`Gas estimation failed: ${error.message}`)
    }
  }

  /**
   * Optimize gas price based on network conditions
   */
  async optimizeGasPrice(transaction) {
    try {
      // Get current gas price
      const gasPrice = await this.publicClient.getGasPrice()
      
      // Get network gas data
      const networkGasData = await this.getNetworkGasData()
      
      // Calculate optimized gas price
      let optimizedGasPrice = gasPrice
      
      if (networkGasData.congestion === 'high') {
        // Increase gas price by 50% during high congestion
        optimizedGasPrice = gasPrice + (gasPrice * 50n / 100n)
      } else if (networkGasData.congestion === 'low') {
        // Decrease gas price by 10% during low congestion
        optimizedGasPrice = gasPrice - (gasPrice * 10n / 100n)
      }
      
      transaction.gasPrice = optimizedGasPrice
      
      console.log(`⚡ Gas price optimized for ${transaction.id}: ${optimizedGasPrice}`)
      
    } catch (error) {
      console.error(`❌ Gas price optimization failed for ${transaction.id}:`, error)
      // Use default gas price if optimization fails
      transaction.gasPrice = await this.publicClient.getGasPrice()
    }
  }

  /**
   * Get network gas data
   */
  async getNetworkGasData() {
    try {
      const network = getCurrentNetwork()
      const cacheKey = network.id
      
      // Check cache first
      const cached = this.gasTracker.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 seconds cache
        return cached.data
      }
      
      // Get current block
      const block = await this.publicClient.getBlock({ blockTag: 'latest' })
      
      // Calculate congestion based on gas usage
      const gasUsedPercentage = Number(block.gasUsed * 100n / block.gasLimit)
      
      let congestion = 'normal'
      if (gasUsedPercentage > 80) {
        congestion = 'high'
      } else if (gasUsedPercentage < 30) {
        congestion = 'low'
      }
      
      const gasData = {
        congestion,
        gasUsedPercentage,
        blockNumber: Number(block.number),
        baseFeePerGas: block.baseFeePerGas || 0n,
        timestamp: Date.now()
      }
      
      // Cache the data
      this.gasTracker.set(cacheKey, {
        data: gasData,
        timestamp: Date.now()
      })
      
      return gasData
      
    } catch (error) {
      console.error('❌ Failed to get network gas data:', error)
      return {
        congestion: 'normal',
        gasUsedPercentage: 50,
        blockNumber: 0,
        baseFeePerGas: 0n,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Send transaction to blockchain
   */
  async sendTransaction(transaction) {
    try {
      if (!this.walletClient) {
        throw new Error('Wallet client not initialized')
      }
      
      transaction.status = 'sending'
      transaction.attempts++
      this.emit('transactionUpdated', transaction)
      
      const txRequest = {
        to: transaction.request.to,
        data: transaction.request.data,
        value: transaction.request.value,
        gas: transaction.gasEstimate,
        gasPrice: transaction.gasPrice
      }
      
      const hash = await this.walletClient.sendTransaction(txRequest)
      
      transaction.hash = hash
      transaction.status = 'pending'
      transaction.updatedAt = new Date()
      
      this.pendingTransactions.add(transaction.id)
      this.stats.totalTransactions++
      
      console.log(`📤 Transaction sent: ${hash}`)
      this.emit('transactionSent', transaction)
      
      return { hash }
      
    } catch (error) {
      console.error(`❌ Failed to send transaction ${transaction.id}:`, error)
      
      // Check if this is a retryable error
      if (this.isRetryableError(error) && transaction.retryCount < this.maxRetries) {
        console.log(`🔄 Queueing transaction ${transaction.id} for retry`)
        this.queueForRetry(transaction)
      } else {
        transaction.status = 'failed'
        transaction.error = error.message
        this.stats.failedTransactions++
      }
      
      throw error
    }
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(transaction) {
    if (!transaction.hash) return
    
    const maxWaitTime = 300000 // 5 minutes
    const startTime = Date.now()
    
    const checkStatus = async () => {
      try {
        const receipt = await this.publicClient.getTransactionReceipt({
          hash: transaction.hash
        })
        
        if (receipt) {
          // Transaction confirmed
          transaction.receipt = receipt
          transaction.status = receipt.status === 'success' ? 'confirmed' : 'failed'
          transaction.gasUsed = receipt.gasUsed
          transaction.updatedAt = new Date()
          
          this.pendingTransactions.delete(transaction.id)
          
          if (receipt.status === 'success') {
            this.stats.successfulTransactions++
            this.stats.totalGasUsed += receipt.gasUsed
            console.log(`✅ Transaction confirmed: ${transaction.hash}`)
            this.emit('transactionConfirmed', transaction)
          } else {
            this.stats.failedTransactions++
            console.log(`❌ Transaction failed: ${transaction.hash}`)
            this.emit('transactionFailed', transaction)
          }
          
          return
        }
        
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          console.log(`⏰ Transaction ${transaction.hash} monitoring timeout`)
          transaction.status = 'timeout'
          transaction.updatedAt = new Date()
          this.pendingTransactions.delete(transaction.id)
          this.emit('transactionTimeout', transaction)
          return
        }
        
        // Continue monitoring
        setTimeout(checkStatus, 5000) // Check every 5 seconds
        
      } catch (error) {
        console.error(`❌ Error monitoring transaction ${transaction.hash}:`, error)
        setTimeout(checkStatus, 10000) // Retry in 10 seconds
      }
    }
    
    // Start monitoring
    setTimeout(checkStatus, 2000) // Initial delay of 2 seconds
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'network error',
      'timeout',
      'nonce too low',
      'replacement transaction underpriced',
      'insufficient funds for gas',
      'connection error'
    ]
    
    const errorMessage = error.message.toLowerCase()
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    )
  }

  /**
   * Queue transaction for retry
   */
  queueForRetry(transaction) {
    transaction.retryCount++
    transaction.status = 'queued_for_retry'
    transaction.updatedAt = new Date()
    
    this.retryQueue.push({
      transaction,
      retryAt: Date.now() + (this.retryDelay * transaction.retryCount)
    })
    
    this.stats.retriedTransactions++
    this.emit('transactionQueued', transaction)
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const now = Date.now()
    const readyToRetry = this.retryQueue.filter(item => item.retryAt <= now)
    
    for (const item of readyToRetry) {
      try {
        console.log(`🔄 Retrying transaction ${item.transaction.id}`)
        
        // Remove from retry queue
        const index = this.retryQueue.indexOf(item)
        this.retryQueue.splice(index, 1)
        
        // Re-estimate gas and gas price
        await this.estimateGas(item.transaction)
        await this.optimizeGasPrice(item.transaction)
        
        // Retry sending
        await this.sendTransaction(item.transaction)
        
        // Monitor the retry
        this.monitorTransaction(item.transaction)
        
      } catch (error) {
        console.error(`❌ Retry failed for transaction ${item.transaction.id}:`, error)
        
        if (item.transaction.retryCount < this.maxRetries) {
          // Queue for another retry
          this.queueForRetry(item.transaction)
        } else {
          // Max retries reached
          item.transaction.status = 'failed'
          item.transaction.error = `Max retries reached: ${error.message}`
          this.emit('transactionFailed', item.transaction)
        }
      }
    }
  }

  /**
   * Start monitoring system
   */
  startMonitoring() {
    // Process retry queue every 10 seconds
    setInterval(() => {
      this.processRetryQueue()
    }, 10000)
    
    // Update gas tracker every 30 seconds
    setInterval(() => {
      this.getNetworkGasData()
    }, 30000)
    
    console.log('📊 Transaction monitoring started')
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId) {
    return this.transactions.get(transactionId)
  }

  /**
   * Get transaction by hash
   */
  getTransactionByHash(hash) {
    for (const transaction of this.transactions.values()) {
      if (transaction.hash === hash) {
        return transaction
      }
    }
    return null
  }

  /**
   * Get user's transaction history
   */
  getUserTransactions(userAddress, limit = 50) {
    const userTransactions = []
    
    for (const transaction of this.transactions.values()) {
      if (transaction.request.from?.toLowerCase() === userAddress.toLowerCase()) {
        userTransactions.push(transaction)
      }
    }
    
    // Sort by creation date (newest first)
    userTransactions.sort((a, b) => b.createdAt - a.createdAt)
    
    return userTransactions.slice(0, limit)
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions).map(id => this.transactions.get(id))
  }

  /**
   * Cancel transaction (if possible)
   */
  async cancelTransaction(transactionId) {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }
    
    if (transaction.status !== 'pending') {
      throw new Error('Transaction cannot be cancelled')
    }
    
    try {
      // Send a replacement transaction with higher gas price and same nonce
      // This is a simplified implementation
      console.log(`🚫 Attempting to cancel transaction ${transactionId}`)
      
      transaction.status = 'cancelling'
      this.emit('transactionUpdated', transaction)
      
      // In a real implementation, you would send a replacement transaction
      // For now, we'll just mark it as cancelled
      transaction.status = 'cancelled'
      transaction.updatedAt = new Date()
      
      this.pendingTransactions.delete(transactionId)
      this.emit('transactionCancelled', transaction)
      
      return true
      
    } catch (error) {
      console.error(`❌ Failed to cancel transaction ${transactionId}:`, error)
      throw error
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingTransactions: this.pendingTransactions.size,
      queuedRetries: this.retryQueue.length,
      totalTransactionsTracked: this.transactions.size,
      successRate: this.stats.totalTransactions > 0 
        ? (this.stats.successfulTransactions / this.stats.totalTransactions * 100).toFixed(2) + '%'
        : '0%',
      averageGasUsed: this.stats.successfulTransactions > 0
        ? Number(this.stats.totalGasUsed / BigInt(this.stats.successfulTransactions))
        : 0
    }
  }

  /**
   * Clear transaction history (keep only recent transactions)
   */
  clearOldTransactions(maxAge = 86400000) { // 24 hours
    const cutoff = Date.now() - maxAge
    const toDelete = []
    
    for (const [id, transaction] of this.transactions) {
      if (transaction.createdAt.getTime() < cutoff && 
          !this.pendingTransactions.has(id)) {
        toDelete.push(id)
      }
    }
    
    toDelete.forEach(id => this.transactions.delete(id))
    
    console.log(`🧹 Cleared ${toDelete.length} old transactions`)
  }
}

export default TransactionManager