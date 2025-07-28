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

class ProviderAggregator extends EventEmitter {
  constructor() {
    super()
    this.providers = new Map()
    this.rateCache = new Map()
    this.healthStatus = new Map()
    this.rateLimits = new Map()
    
    // Configuration
    this.config = {
      rateCacheTimeout: 30000, // 30 seconds
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 3,
      requestTimeout: 10000, // 10 seconds
      rateLimitWindow: 60000, // 1 minute
      maxRequestsPerWindow: 100
    }
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providersOnline: 0,
      lastHealthCheck: null
    }
    
    // Initialize providers
    this.initializeProviders()
  }

  /**
   * Initialize all supported off-ramp providers
   */
  initializeProviders() {
    console.log('🏦 Initializing off-ramp providers...')
    
    // Tier 1 Providers (High volume, global)
    this.addProvider('paycrest', {
      name: 'Paycrest',
      type: 'api',
      tier: 1,
      baseUrl: 'https://api.paycrest.co/v1',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS'],
      supportedCountries: ['US', 'EU', 'GB', 'NG', 'KE', 'GH'],
      minAmount: 10, // USD
      maxAmount: 50000, // USD
      avgFeePercentage: 2.5,
      avgProcessingTime: 300, // 5 minutes
      reliability: 0.98,
      apiKey: process.env.PAYCREST_API_KEY,
      endpoints: {
        rates: '/rates',
        convert: '/sender/payout',
        status: '/sender/payout/{id}'
      }
    })
    
    this.addProvider('transak', {
      name: 'Transak',
      type: 'api',
      tier: 1,
      baseUrl: 'https://api.transak.com/api/v2',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'BRL'],
      supportedCountries: ['US', 'EU', 'GB', 'IN', 'BR'],
      minAmount: 20,
      maxAmount: 20000,
      avgFeePercentage: 3.0,
      avgProcessingTime: 600, // 10 minutes
      reliability: 0.96,
      apiKey: process.env.TRANSAK_API_KEY,
      endpoints: {
        rates: '/currencies/price',
        convert: '/orders',
        status: '/orders/{id}'
      }
    })
    
    this.addProvider('ramp', {
      name: 'Ramp Network',
      type: 'api',
      tier: 1,
      baseUrl: 'https://api.ramp.network/api',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedCountries: ['US', 'EU', 'GB'],
      minAmount: 50,
      maxAmount: 100000,
      avgFeePercentage: 2.0,
      avgProcessingTime: 180, // 3 minutes
      reliability: 0.99,
      apiKey: process.env.RAMP_API_KEY,
      endpoints: {
        rates: '/host-api/crypto/price',
        convert: '/host-api/purchase',
        status: '/host-api/purchase/{id}'
      }
    })
    
    // Tier 2 Providers (Regional specialists)
    this.addProvider('moonpay', {
      name: 'MoonPay',
      type: 'api',
      tier: 2,
      baseUrl: 'https://api.moonpay.com/v1',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      supportedCountries: ['US', 'EU', 'GB', 'CA', 'AU'],
      minAmount: 30,
      maxAmount: 50000,
      avgFeePercentage: 3.5,
      avgProcessingTime: 900, // 15 minutes
      reliability: 0.94,
      apiKey: process.env.MOONPAY_API_KEY,
      endpoints: {
        rates: '/currencies/eth/price',
        convert: '/transactions',
        status: '/transactions/{id}'
      }
    })
    
    this.addProvider('banxa', {
      name: 'Banxa',
      type: 'api',
      tier: 2,
      baseUrl: 'https://api.banxa.com',
      supportedCurrencies: ['USD', 'EUR', 'AUD', 'CAD'],
      supportedCountries: ['US', 'EU', 'AU', 'CA'],
      minAmount: 25,
      maxAmount: 25000,
      avgFeePercentage: 3.2,
      avgProcessingTime: 720, // 12 minutes
      reliability: 0.92,
      apiKey: process.env.BANXA_API_KEY,
      endpoints: {
        rates: '/api/prices',
        convert: '/api/orders',
        status: '/api/orders/{id}'
      }
    })
    
    // Add more providers...
    this.addRegionalProviders()
    this.addSpecialtyProviders()
    
    console.log(`✅ Initialized ${this.providers.size} off-ramp providers`)
  }

  /**
   * Add regional providers
   */
  addRegionalProviders() {
    // African providers
    this.addProvider('flutterwave', {
      name: 'Flutterwave',
      type: 'api',
      tier: 2,
      region: 'Africa',
      baseUrl: 'https://api.flutterwave.com/v3',
      supportedCurrencies: ['NGN', 'KES', 'GHS', 'UGX', 'ZAR'],
      supportedCountries: ['NG', 'KE', 'GH', 'UG', 'ZA'],
      minAmount: 5,
      maxAmount: 10000,
      avgFeePercentage: 2.8,
      avgProcessingTime: 300,
      reliability: 0.95,
      apiKey: process.env.FLUTTERWAVE_API_KEY
    })
    
    // Asian providers
    this.addProvider('coinhako', {
      name: 'Coinhako',
      type: 'api',
      tier: 2,
      region: 'Asia',
      baseUrl: 'https://api.coinhako.com/v3',
      supportedCurrencies: ['SGD', 'MYR', 'THB'],
      supportedCountries: ['SG', 'MY', 'TH'],
      minAmount: 20,
      maxAmount: 15000,
      avgFeePercentage: 3.0,
      avgProcessingTime: 480,
      reliability: 0.90,
      apiKey: process.env.COINHAKO_API_KEY
    })
    
    // Latin American providers
    this.addProvider('bitso', {
      name: 'Bitso',
      type: 'api',
      tier: 2,
      region: 'LATAM',
      baseUrl: 'https://api.bitso.com/v3',
      supportedCurrencies: ['MXN', 'ARS', 'BRL'],
      supportedCountries: ['MX', 'AR', 'BR'],
      minAmount: 15,
      maxAmount: 20000,
      avgFeePercentage: 2.7,
      avgProcessingTime: 360,
      reliability: 0.93,
      apiKey: process.env.BITSO_API_KEY
    })
  }

  /**
   * Add specialty providers
   */
  addSpecialtyProviders() {
    // High-volume institutional
    this.addProvider('b2c2', {
      name: 'B2C2',
      type: 'api',
      tier: 1,
      specialty: 'institutional',
      baseUrl: 'https://api.b2c2.net',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedCountries: ['US', 'EU', 'GB'],
      minAmount: 1000,
      maxAmount: 1000000,
      avgFeePercentage: 1.5,
      avgProcessingTime: 120,
      reliability: 0.99,
      apiKey: process.env.B2C2_API_KEY
    })
    
    // Privacy-focused
    this.addProvider('incognito', {
      name: 'Incognito',
      type: 'api',
      tier: 3,
      specialty: 'privacy',
      baseUrl: 'https://api.incognito.org',
      supportedCurrencies: ['USD', 'EUR'],
      supportedCountries: ['US', 'EU'],
      minAmount: 100,
      maxAmount: 5000,
      avgFeePercentage: 4.0,
      avgProcessingTime: 1800, // 30 minutes
      reliability: 0.88,
      apiKey: process.env.INCOGNITO_API_KEY
    })
  }

  /**
   * Add a provider to the aggregator
   */
  addProvider(id, config) {
    this.providers.set(id, {
      id,
      ...config,
      isActive: true,
      lastHealthCheck: null,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0
    })
    
    this.healthStatus.set(id, {
      isHealthy: true,
      lastCheck: null,
      responseTime: 0,
      errorRate: 0
    })
  }

  /**
   * Get available providers for specific criteria
   */
  getAvailableProviders(criteria = {}) {
    const {
      currency = 'USD',
      country = 'US',
      amount = 100,
      tier = null,
      region = null,
      specialty = null
    } = criteria
    
    const availableProviders = []
    
    for (const [id, provider] of this.providers) {
      // Check if provider is active and healthy
      if (!provider.isActive || !this.healthStatus.get(id)?.isHealthy) {
        continue
      }
      
      // Check currency support
      if (!provider.supportedCurrencies.includes(currency)) {
        continue
      }
      
      // Check country support
      if (!provider.supportedCountries.includes(country)) {
        continue
      }
      
      // Check amount limits
      if (amount < provider.minAmount || amount > provider.maxAmount) {
        continue
      }
      
      // Check tier filter
      if (tier && provider.tier !== tier) {
        continue
      }
      
      // Check region filter
      if (region && provider.region !== region) {
        continue
      }
      
      // Check specialty filter
      if (specialty && provider.specialty !== specialty) {
        continue
      }
      
      availableProviders.push(provider)
    }
    
    // Sort by reliability and fees
    return availableProviders.sort((a, b) => {
      const scoreA = a.reliability * 100 - a.avgFeePercentage
      const scoreB = b.reliability * 100 - b.avgFeePercentage
      return scoreB - scoreA
    })
  }

  /**
   * Get real-time rates from all available providers
   */
  async getBestRates(amount, fromCurrency = 'ETH', toCurrency = 'USD', country = 'US') {
    const cacheKey = `${amount}-${fromCurrency}-${toCurrency}-${country}`
    
    // Check cache first
    const cached = this.rateCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.config.rateCacheTimeout) {
      return cached.data
    }
    
    const availableProviders = this.getAvailableProviders({
      currency: toCurrency,
      country,
      amount
    })
    
    if (availableProviders.length === 0) {
      throw new Error(`No providers available for ${toCurrency} in ${country}`)
    }
    
    console.log(`💱 Getting rates from ${availableProviders.length} providers...`)
    
    const ratePromises = availableProviders.map(provider => 
      this.getProviderRate(provider, amount, fromCurrency, toCurrency)
        .catch(error => ({
          providerId: provider.id,
          error: error.message,
          rate: null
        }))
    )
    
    const results = await Promise.all(ratePromises)
    
    // Filter successful results and calculate net amounts
    const validRates = results
      .filter(result => result.rate !== null)
      .map(result => ({
        ...result,
        netAmount: result.rate.fiatAmount - result.rate.totalFees,
        feePercentage: (result.rate.totalFees / result.rate.fiatAmount) * 100
      }))
      .sort((a, b) => b.netAmount - a.netAmount) // Sort by best net amount
    
    const rateComparison = {
      requestedAmount: amount,
      fromCurrency,
      toCurrency,
      country,
      rates: validRates,
      bestRate: validRates[0] || null,
      timestamp: Date.now(),
      providersChecked: availableProviders.length,
      successfulResponses: validRates.length
    }
    
    // Cache the results
    this.rateCache.set(cacheKey, {
      data: rateComparison,
      timestamp: Date.now()
    })
    
    console.log(`✅ Rate comparison complete: ${validRates.length}/${availableProviders.length} providers responded`)
    
    return rateComparison
  }

  /**
   * Get rate from specific provider
   */
  async getProviderRate(provider, amount, fromCurrency, toCurrency) {
    const startTime = Date.now()
    
    try {
      // Check rate limiting
      if (this.isRateLimited(provider.id)) {
        throw new Error('Rate limited')
      }
      
      let rate
      
      switch (provider.id) {
        case 'paycrest':
          rate = await this.getPaycrestRate(provider, amount, fromCurrency, toCurrency)
          break
        case 'transak':
          rate = await this.getTransakRate(provider, amount, fromCurrency, toCurrency)
          break
        case 'ramp':
          rate = await this.getRampRate(provider, amount, fromCurrency, toCurrency)
          break
        case 'moonpay':
          rate = await this.getMoonPayRate(provider, amount, fromCurrency, toCurrency)
          break
        default:
          rate = await this.getGenericRate(provider, amount, fromCurrency, toCurrency)
      }
      
      const responseTime = Date.now() - startTime
      this.updateProviderStats(provider.id, true, responseTime)
      
      return {
        providerId: provider.id,
        providerName: provider.name,
        rate,
        responseTime,
        timestamp: Date.now()
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateProviderStats(provider.id, false, responseTime)
      
      console.error(`❌ Failed to get rate from ${provider.name}:`, error.message)
      throw error
    }
  }

  /**
   * Get rate from Paycrest
   */
  async getPaycrestRate(provider, amount, fromCurrency, toCurrency) {
    const response = await this.makeRequest(provider, 'GET', '/rates', {
      params: {
        from: fromCurrency,
        to: toCurrency,
        amount: amount
      }
    })
    
    return {
      exchangeRate: response.data.rate,
      fiatAmount: response.data.fiat_amount,
      fees: response.data.fees,
      totalFees: response.data.total_fees,
      processingTime: provider.avgProcessingTime,
      expiresAt: Date.now() + 300000 // 5 minutes
    }
  }

  /**
   * Get rate from Transak
   */
  async getTransakRate(provider, amount, fromCurrency, toCurrency) {
    const response = await this.makeRequest(provider, 'GET', '/currencies/price', {
      params: {
        fiatCurrency: toCurrency,
        cryptoCurrency: fromCurrency,
        cryptoAmount: amount,
        paymentMethod: 'bank_transfer'
      }
    })
    
    const data = response.data.response
    
    return {
      exchangeRate: data.conversionPrice,
      fiatAmount: data.fiatAmount,
      fees: data.totalFee,
      totalFees: data.totalFee,
      processingTime: provider.avgProcessingTime,
      expiresAt: Date.now() + 600000 // 10 minutes
    }
  }

  /**
   * Get rate from Ramp Network
   */
  async getRampRate(provider, amount, fromCurrency, toCurrency) {
    const response = await this.makeRequest(provider, 'GET', '/host-api/crypto/price', {
      params: {
        cryptoCurrency: fromCurrency,
        fiatCurrency: toCurrency,
        cryptoAmount: amount
      }
    })
    
    return {
      exchangeRate: response.data.price,
      fiatAmount: response.data.fiatValue,
      fees: response.data.appliedFee,
      totalFees: response.data.appliedFee,
      processingTime: provider.avgProcessingTime,
      expiresAt: Date.now() + 180000 // 3 minutes
    }
  }

  /**
   * Get rate from MoonPay
   */
  async getMoonPayRate(provider, amount, fromCurrency, toCurrency) {
    const response = await this.makeRequest(provider, 'GET', '/currencies/eth/price', {
      params: {
        baseCurrencyCode: toCurrency.toLowerCase(),
        baseCurrencyAmount: amount
      }
    })
    
    return {
      exchangeRate: response.data.price,
      fiatAmount: amount * response.data.price,
      fees: amount * response.data.price * 0.035, // 3.5% estimated
      totalFees: amount * response.data.price * 0.035,
      processingTime: provider.avgProcessingTime,
      expiresAt: Date.now() + 900000 // 15 minutes
    }
  }

  /**
   * Generic rate fetching for other providers
   */
  async getGenericRate(provider, amount, fromCurrency, toCurrency) {
    // Fallback implementation using estimated rates
    const estimatedRate = await this.getEstimatedRate(fromCurrency, toCurrency)
    const fiatAmount = amount * estimatedRate
    const fees = fiatAmount * (provider.avgFeePercentage / 100)
    
    return {
      exchangeRate: estimatedRate,
      fiatAmount,
      fees,
      totalFees: fees,
      processingTime: provider.avgProcessingTime,
      expiresAt: Date.now() + 300000,
      estimated: true
    }
  }

  /**
   * Get estimated exchange rate (fallback)
   */
  async getEstimatedRate(fromCurrency, toCurrency) {
    // In production, use a reliable price feed like CoinGecko
    const priceFeeds = {
      'ETH-USD': 2000,
      'ETH-EUR': 1800,
      'ETH-GBP': 1600,
      'ETH-NGN': 800000
    }
    
    return priceFeeds[`${fromCurrency}-${toCurrency}`] || 2000
  }

  /**
   * Select optimal provider based on criteria
   */
  selectOptimalProvider(rates, criteria = {}) {
    const {
      prioritize = 'net_amount', // 'net_amount', 'speed', 'reliability', 'fees'
      maxFeePercentage = 5,
      maxProcessingTime = 1800, // 30 minutes
      minReliability = 0.9
    } = criteria
    
    if (!rates.rates || rates.rates.length === 0) {
      return null
    }
    
    // Filter by criteria
    let eligibleRates = rates.rates.filter(rate => {
      const provider = this.providers.get(rate.providerId)
      
      return (
        rate.feePercentage <= maxFeePercentage &&
        rate.rate.processingTime <= maxProcessingTime &&
        provider.reliability >= minReliability
      )
    })
    
    if (eligibleRates.length === 0) {
      // Relax criteria if no providers meet requirements
      eligibleRates = rates.rates.slice(0, 3) // Top 3 by net amount
    }
    
    // Sort by priority
    switch (prioritize) {
      case 'speed':
        eligibleRates.sort((a, b) => a.rate.processingTime - b.rate.processingTime)
        break
      case 'reliability':
        eligibleRates.sort((a, b) => {
          const providerA = this.providers.get(a.providerId)
          const providerB = this.providers.get(b.providerId)
          return providerB.reliability - providerA.reliability
        })
        break
      case 'fees':
        eligibleRates.sort((a, b) => a.feePercentage - b.feePercentage)
        break
      case 'net_amount':
      default:
        eligibleRates.sort((a, b) => b.netAmount - a.netAmount)
    }
    
    const selected = eligibleRates[0]
    const provider = this.providers.get(selected.providerId)
    
    return {
      ...selected,
      provider: {
        id: provider.id,
        name: provider.name,
        tier: provider.tier,
        reliability: provider.reliability
      },
      selectionReason: prioritize,
      alternativeCount: eligibleRates.length - 1
    }
  }

  /**
   * Make HTTP request to provider API
   */
  async makeRequest(provider, method, endpoint, options = {}) {
    const url = `${provider.baseUrl}${endpoint}`
    const config = {
      method,
      url,
      timeout: this.config.requestTimeout,
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Meno-NFT-Offramp/1.0'
      },
      ...options
    }
    
    this.updateRateLimit(provider.id)
    
    const response = await axios(config)
    return response
  }

  /**
   * Check if provider is rate limited
   */
  isRateLimited(providerId) {
    const limit = this.rateLimits.get(providerId)
    if (!limit) return false
    
    const now = Date.now()
    if (now > limit.resetTime) {
      this.rateLimits.delete(providerId)
      return false
    }
    
    return limit.count >= this.config.maxRequestsPerWindow
  }

  /**
   * Update rate limit for provider
   */
  updateRateLimit(providerId) {
    const now = Date.now()
    const limit = this.rateLimits.get(providerId)
    
    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(providerId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      })
    } else {
      limit.count++
    }
  }

  /**
   * Update provider statistics
   */
  updateProviderStats(providerId, success, responseTime) {
    const provider = this.providers.get(providerId)
    if (!provider) return
    
    provider.totalRequests++
    
    if (success) {
      provider.successfulRequests++
      provider.consecutiveFailures = 0
      
      // Update average response time
      if (provider.averageResponseTime === 0) {
        provider.averageResponseTime = responseTime
      } else {
        provider.averageResponseTime = (provider.averageResponseTime + responseTime) / 2
      }
    } else {
      provider.consecutiveFailures++
      
      // Disable provider if too many consecutive failures
      if (provider.consecutiveFailures >= 5) {
        provider.isActive = false
        console.warn(`⚠️ Provider ${provider.name} disabled due to consecutive failures`)
      }
    }
    
    // Update global stats
    this.stats.totalRequests++
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
   * Perform health checks on all providers
   */
  async performHealthChecks() {
    console.log('🏥 Performing provider health checks...')
    
    const healthPromises = Array.from(this.providers.keys()).map(providerId =>
      this.checkProviderHealth(providerId).catch(error => ({
        providerId,
        error: error.message,
        isHealthy: false
      }))
    )
    
    const results = await Promise.all(healthPromises)
    
    let healthyCount = 0
    for (const result of results) {
      const health = {
        isHealthy: result.isHealthy !== false,
        lastCheck: Date.now(),
        responseTime: result.responseTime || 0,
        errorRate: result.errorRate || 0
      }
      
      this.healthStatus.set(result.providerId, health)
      
      if (health.isHealthy) {
        healthyCount++
      }
    }
    
    this.stats.providersOnline = healthyCount
    this.stats.lastHealthCheck = Date.now()
    
    console.log(`✅ Health check complete: ${healthyCount}/${this.providers.size} providers healthy`)
    
    this.emit('healthCheckComplete', {
      total: this.providers.size,
      healthy: healthyCount,
      results
    })
  }

  /**
   * Check health of specific provider
   */
  async checkProviderHealth(providerId) {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }
    
    const startTime = Date.now()
    
    try {
      // Simple health check - get rates for small amount
      await this.getProviderRate(provider, 0.01, 'ETH', 'USD')
      
      const responseTime = Date.now() - startTime
      const errorRate = provider.totalRequests > 0 ? 
        (provider.totalRequests - provider.successfulRequests) / provider.totalRequests : 0
      
      return {
        providerId,
        isHealthy: true,
        responseTime,
        errorRate
      }
      
    } catch (error) {
      return {
        providerId,
        isHealthy: false,
        error: error.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get aggregator statistics
   */
  getStats() {
    const providerStats = Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      tier: provider.tier,
      isActive: provider.isActive,
      totalRequests: provider.totalRequests,
      successRate: provider.totalRequests > 0 ? 
        (provider.successfulRequests / provider.totalRequests) * 100 : 0,
      averageResponseTime: provider.averageResponseTime,
      consecutiveFailures: provider.consecutiveFailures,
      isHealthy: this.healthStatus.get(id)?.isHealthy || false
    }))
    
    return {
      ...this.stats,
      providers: providerStats,
      cacheSize: this.rateCache.size,
      rateLimitedProviders: this.rateLimits.size
    }
  }

  /**
   * Start background processes
   */
  start() {
    console.log('🚀 Starting ProviderAggregator...')
    
    // Perform initial health check
    this.performHealthChecks()
    
    // Schedule regular health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)
    
    // Schedule cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache()
    }, 60000) // Every minute
    
    console.log('✅ ProviderAggregator started')
    this.emit('started')
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.rateCache) {
      if (now - entry.timestamp > this.config.rateCacheTimeout) {
        this.rateCache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`)
    }
  }

  /**
   * Stop the aggregator
   */
  stop() {
    console.log('🛑 Stopping ProviderAggregator...')
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
    }
    
    this.rateCache.clear()
    this.rateLimits.clear()
    
    console.log('✅ ProviderAggregator stopped')
    this.emit('stopped')
  }
}

export default ProviderAggregator