/**
 * PaycrestService - Paycrest fiat off-ramp integration service
 * Handles USDT/USDC to Nigerian Naira (NGN) conversion via Paycrest API
 */

// Browser-compatible imports
const axios = typeof window !== 'undefined' ? require('axios') : null
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

class PaycrestService extends EventEmitter {
  constructor() {
    super()
    
    // Configuration
    this.config = {
      baseUrl: 'https://api.paycrest.co/v1',
      apiKey: process.env.NEXT_PUBLIC_PAYCREST_API_KEY,
      secretKey: process.env.PAYCREST_SECRET_KEY,
      rateCacheTimeout: 30000, // 30 seconds
      requestTimeout: 10000, // 10 seconds
      maxRetries: 3,
      supportedCurrencies: ['USDT', 'USDC'],
      targetCurrency: 'NGN', // Nigerian Naira
      minAmount: 10, // USD equivalent
      maxAmount: 50000, // USD equivalent
      avgFeePercentage: 2.5,
      avgProcessingTime: 300 // 5 minutes
    }
    
    // Rate cache
    this.rateCache = new Map()
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      totalVolumeProcessed: 0
    }
    
    console.log('🏦 PaycrestService initialized for USDT/USDC to NGN conversion')
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing PaycrestService...')
      
      // Validate configuration
      if (!this.config.apiKey) {
        console.warn('⚠️ Paycrest API key not found in environment variables')
      }
      
      // Test connection (if API key is available)
      if (this.config.apiKey) {
        await this.testConnection()
      }
      
      console.log('✅ PaycrestService initialized successfully')
      this.emit('initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize PaycrestService:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Test connection to Paycrest API
   */
  async testConnection() {
    try {
      // Simple health check endpoint (adjust based on Paycrest API docs)
      const response = await this.makeRequest('GET', '/health', {}, false)
      console.log('✅ Paycrest API connection successful')
      return true
    } catch (error) {
      console.warn('⚠️ Paycrest API connection test failed:', error.message)
      return false
    }
  }

  /**
   * Get conversion rate from USDT/USDC to NGN
   */
  async getConversionRate(amount, fromCurrency = 'USDT') {
    const cacheKey = `${amount}-${fromCurrency}-NGN`
    
    // Check cache first
    const cached = this.rateCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.config.rateCacheTimeout) {
      return cached.data
    }
    
    try {
      console.log(`💱 Getting conversion rate: ${amount} ${fromCurrency} to NGN`)
      
      const startTime = Date.now()
      
      // Make API request to Paycrest
      const response = await this.makeRequest('GET', '/rates', {
        params: {
          from: fromCurrency,
          to: 'NGN',
          amount: amount
        }
      })
      
      const responseTime = Date.now() - startTime
      
      // Process response based on Paycrest API structure
      const rateData = {
        fromCurrency,
        toCurrency: 'NGN',
        amount,
        exchangeRate: response.data.rate || this.getEstimatedRate(fromCurrency),
        fiatAmount: response.data.fiat_amount || (amount * this.getEstimatedRate(fromCurrency)),
        fees: response.data.fees || (amount * this.getEstimatedRate(fromCurrency) * 0.025),
        totalFees: response.data.total_fees || (amount * this.getEstimatedRate(fromCurrency) * 0.025),
        netAmount: response.data.net_amount || (amount * this.getEstimatedRate(fromCurrency) * 0.975),
        processingTime: this.config.avgProcessingTime,
        expiresAt: Date.now() + 300000, // 5 minutes
        timestamp: Date.now(),
        responseTime
      }
      
      // Cache the result
      this.rateCache.set(cacheKey, {
        data: rateData,
        timestamp: Date.now()
      })
      
      this.updateStats(true, responseTime)
      
      console.log(`✅ Rate retrieved: 1 ${fromCurrency} = ${rateData.exchangeRate} NGN`)
      return rateData
      
    } catch (error) {
      console.error(`❌ Failed to get conversion rate:`, error)
      this.updateStats(false, 0)
      
      // Return estimated rate as fallback
      return this.getEstimatedRateData(amount, fromCurrency)
    }
  }

  /**
   * Initiate fiat conversion
   */
  async initiateConversion(conversionData) {
    const {
      amount,
      fromCurrency = 'USDT',
      userAddress,
      bankDetails,
      recipientName,
      recipientPhone
    } = conversionData
    
    try {
      console.log(`🚀 Initiating conversion: ${amount} ${fromCurrency} to NGN`)
      
      // Validate input
      this.validateConversionData(conversionData)
      
      const startTime = Date.now()
      
      // Make conversion request to Paycrest
      const response = await this.makeRequest('POST', '/sender/payout', {
        data: {
          amount,
          from_currency: fromCurrency,
          to_currency: 'NGN',
          sender_address: userAddress,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          bank_details: bankDetails,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paycrest/callback`
        }
      })
      
      const responseTime = Date.now() - startTime
      
      const conversionResult = {
        conversionId: response.data.id || `pc_${Date.now()}`,
        status: response.data.status || 'initiated',
        amount,
        fromCurrency,
        toCurrency: 'NGN',
        exchangeRate: response.data.exchange_rate,
        fiatAmount: response.data.fiat_amount,
        fees: response.data.fees,
        netAmount: response.data.net_amount,
        estimatedCompletion: Date.now() + (this.config.avgProcessingTime * 1000),
        createdAt: Date.now(),
        responseTime
      }
      
      this.updateStats(true, responseTime)
      this.stats.totalVolumeProcessed += conversionResult.fiatAmount || 0
      
      console.log(`✅ Conversion initiated: ${conversionResult.conversionId}`)
      this.emit('conversionInitiated', conversionResult)
      
      return conversionResult
      
    } catch (error) {
      console.error(`❌ Failed to initiate conversion:`, error)
      this.updateStats(false, 0)
      this.emit('conversionFailed', { error: error.message, conversionData })
      throw error
    }
  }

  /**
   * Check conversion status
   */
  async getConversionStatus(conversionId) {
    try {
      console.log(`🔍 Checking conversion status: ${conversionId}`)
      
      const response = await this.makeRequest('GET', `/sender/payout/${conversionId}`)
      
      const statusData = {
        conversionId,
        status: response.data.status || 'unknown',
        amount: response.data.amount,
        fiatAmount: response.data.fiat_amount,
        fees: response.data.fees,
        completedAt: response.data.completed_at,
        failureReason: response.data.failure_reason,
        updatedAt: Date.now()
      }
      
      console.log(`📊 Conversion status: ${statusData.status}`)
      this.emit('statusUpdated', statusData)
      
      return statusData
      
    } catch (error) {
      console.error(`❌ Failed to get conversion status:`, error)
      throw error
    }
  }

  /**
   * Validate conversion data
   */
  validateConversionData(data) {
    const { amount, fromCurrency, bankDetails, recipientName, recipientPhone } = data
    
    if (!amount || amount < this.config.minAmount) {
      throw new Error(`Amount must be at least ${this.config.minAmount} USD`)
    }
    
    if (amount > this.config.maxAmount) {
      throw new Error(`Amount cannot exceed ${this.config.maxAmount} USD`)
    }
    
    if (!this.config.supportedCurrencies.includes(fromCurrency)) {
      throw new Error(`Unsupported currency: ${fromCurrency}`)
    }
    
    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankCode) {
      throw new Error('Valid bank details are required')
    }
    
    if (!recipientName || recipientName.length < 2) {
      throw new Error('Valid recipient name is required')
    }
    
    if (!recipientPhone || recipientPhone.length < 10) {
      throw new Error('Valid recipient phone number is required')
    }
  }

  /**
   * Make HTTP request to Paycrest API
   */
  async makeRequest(method, endpoint, options = {}, requireAuth = true) {
    if (!axios) {
      throw new Error('HTTP client not available in this environment')
    }
    
    const url = `${this.config.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Meno-NFT-Offramp/1.0'
    }
    
    if (requireAuth && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    
    const config = {
      method,
      url,
      timeout: this.config.requestTimeout,
      headers,
      ...options
    }
    
    const response = await axios(config)
    return response
  }

  /**
   * Get estimated rate (fallback when API is unavailable)
   */
  getEstimatedRate(fromCurrency) {
    // Estimated rates (should be updated with real market data)
    const rates = {
      'USDT': 1650, // 1 USDT = 1650 NGN (approximate)
      'USDC': 1650  // 1 USDC = 1650 NGN (approximate)
    }
    
    return rates[fromCurrency] || 1650
  }

  /**
   * Get estimated rate data (fallback)
   */
  getEstimatedRateData(amount, fromCurrency) {
    const exchangeRate = this.getEstimatedRate(fromCurrency)
    const fiatAmount = amount * exchangeRate
    const fees = fiatAmount * (this.config.avgFeePercentage / 100)
    
    return {
      fromCurrency,
      toCurrency: 'NGN',
      amount,
      exchangeRate,
      fiatAmount,
      fees,
      totalFees: fees,
      netAmount: fiatAmount - fees,
      processingTime: this.config.avgProcessingTime,
      expiresAt: Date.now() + 300000,
      timestamp: Date.now(),
      estimated: true
    }
  }

  /**
   * Update service statistics
   */
  updateStats(success, responseTime) {
    this.stats.totalRequests++
    this.stats.lastRequestTime = Date.now()
    
    if (success) {
      this.stats.successfulRequests++
    } else {
      this.stats.failedRequests++
    }
    
    // Update average response time
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime
    } else {
      this.stats.averageResponseTime = (this.stats.averageResponseTime + responseTime) / 2
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0
    
    return {
      ...this.stats,
      successRate,
      cacheSize: this.rateCache.size,
      isConfigured: !!this.config.apiKey,
      supportedCurrencies: this.config.supportedCurrencies,
      targetCurrency: this.config.targetCurrency
    }
  }

  /**
   * Clear rate cache
   */
  clearCache() {
    this.rateCache.clear()
    console.log('🧹 Paycrest rate cache cleared')
  }

  /**
   * Stop the service
   */
  stop() {
    console.log('🛑 Stopping PaycrestService...')
    this.clearCache()
    console.log('✅ PaycrestService stopped')
    this.emit('stopped')
  }
}

export default PaycrestService