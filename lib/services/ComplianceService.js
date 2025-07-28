/**
 * ComplianceService - Simplified compliance for core NFT off-ramp flow
 * Focus: Connect Wallet → List/Sell NFT → Bridge → Off-ramp (NO KYC required)
 */

import EventEmitter from 'events'

class ComplianceService extends EventEmitter {
  constructor() {
    super()
    this.userProfiles = new Map()
    this.transactionLogs = new Map()
    
    // Simplified configuration - no KYC required for core flow
    this.config = {
      maxTransactionAmount: 50000, // USD - reasonable limit without KYC
      dailyTransactionLimit: 10000, // USD
      enableBasicValidation: true,
      enableAuditTrail: true,
      requireWalletConnection: true // Only requirement: connected wallet
    }
    
    // Statistics
    this.stats = {
      totalTransactions: 0,
      flaggedTransactions: 0,
      totalUsers: 0,
      auditLogsGenerated: 0
    }
  }

  /**
   * Initialize the compliance service
   */
  async initialize() {
    console.log('✅ ComplianceService initialized (KYC-free mode)')
    this.emit('initialized')
  }

  /**
   * Validate transaction - simplified validation without KYC
   */
  async validateTransaction(userAddress, transactionData) {
    const { amount, currency, type } = transactionData
    
    // Basic validation checks
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresApproval: false
    }
    
    // Check transaction amount limits
    if (amount > this.config.maxTransactionAmount) {
      validationResult.isValid = false
      validationResult.errors.push(`Transaction amount exceeds maximum limit of $${this.config.maxTransactionAmount}`)
    }
    
    // Check daily limits
    const dailyTotal = await this.getDailyTransactionTotal(userAddress)
    if (dailyTotal + amount > this.config.dailyTransactionLimit) {
      validationResult.isValid = false
      validationResult.errors.push(`Daily transaction limit of $${this.config.dailyTransactionLimit} would be exceeded`)
    }
    
    // Log the validation
    await this.logTransaction(userAddress, {
      ...transactionData,
      validationResult,
      timestamp: Date.now()
    })
    
    this.stats.totalTransactions++
    if (!validationResult.isValid) {
      this.stats.flaggedTransactions++
    }
    
    return validationResult
  }

  /**
   * Get user's daily transaction total
   */
  async getDailyTransactionTotal(userAddress) {
    const today = new Date().toDateString()
    const userLogs = this.transactionLogs.get(userAddress) || []
    
    return userLogs
      .filter(log => new Date(log.timestamp).toDateString() === today)
      .reduce((total, log) => total + (log.amount || 0), 0)
  }

  /**
   * Log transaction for audit trail
   */
  async logTransaction(userAddress, transactionData) {
    if (!this.config.enableAuditTrail) return
    
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAddress,
      ...transactionData,
      timestamp: Date.now()
    }
    
    // Store in user's transaction log
    if (!this.transactionLogs.has(userAddress)) {
      this.transactionLogs.set(userAddress, [])
    }
    this.transactionLogs.get(userAddress).push(logEntry)
    
    this.stats.auditLogsGenerated++
    
    // Emit event for external logging systems
    this.emit('transactionLogged', logEntry)
    
    return logEntry.id
  }

  /**
   * Check if user can perform transaction (simplified - just wallet connection)
   */
  async canUserTransact(userAddress, amount = 0) {
    // Only requirement: valid wallet address
    if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
      return {
        canTransact: false,
        reason: 'Valid wallet connection required'
      }
    }
    
    // Check transaction limits
    const dailyTotal = await this.getDailyTransactionTotal(userAddress)
    if (dailyTotal + amount > this.config.dailyTransactionLimit) {
      return {
        canTransact: false,
        reason: `Daily limit of $${this.config.dailyTransactionLimit} would be exceeded`
      }
    }
    
    if (amount > this.config.maxTransactionAmount) {
      return {
        canTransact: false,
        reason: `Amount exceeds maximum limit of $${this.config.maxTransactionAmount}`
      }
    }
    
    return {
      canTransact: true,
      reason: 'Transaction approved'
    }
  }

  /**
   * Get user profile (simplified)
   */
  getUserProfile(userAddress) {
    return this.userProfiles.get(userAddress) || {
      address: userAddress,
      isVerified: true, // Always verified if wallet connected
      verificationLevel: 'wallet_connected',
      transactionLimits: {
        daily: this.config.dailyTransactionLimit,
        single: this.config.maxTransactionAmount
      },
      createdAt: Date.now()
    }
  }

  /**
   * Update user profile
   */
  updateUserProfile(userAddress, updates) {
    const currentProfile = this.getUserProfile(userAddress)
    const updatedProfile = { ...currentProfile, ...updates, updatedAt: Date.now() }
    
    this.userProfiles.set(userAddress, updatedProfile)
    this.emit('profileUpdated', { userAddress, profile: updatedProfile })
    
    return updatedProfile
  }

  /**
   * Get transaction history for user
   */
  getTransactionHistory(userAddress, limit = 50) {
    const userLogs = this.transactionLogs.get(userAddress) || []
    return userLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Generate audit report
   */
  generateAuditReport(userAddress = null, timeRange = 30) {
    const endTime = Date.now()
    const startTime = endTime - (timeRange * 24 * 60 * 60 * 1000) // days to ms
    
    let transactions = []
    
    if (userAddress) {
      // Single user report
      transactions = this.transactionLogs.get(userAddress) || []
    } else {
      // All users report
      for (const userLogs of this.transactionLogs.values()) {
        transactions.push(...userLogs)
      }
    }
    
    // Filter by time range
    transactions = transactions.filter(tx => 
      tx.timestamp >= startTime && tx.timestamp <= endTime
    )
    
    return {
      reportId: `audit_${Date.now()}`,
      timeRange: { startTime, endTime },
      userAddress,
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      flaggedTransactions: transactions.filter(tx => !tx.validationResult?.isValid).length,
      transactions: transactions.sort((a, b) => b.timestamp - a.timestamp),
      generatedAt: Date.now()
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeUsers: this.userProfiles.size,
      totalAuditLogs: Array.from(this.transactionLogs.values())
        .reduce((total, logs) => total + logs.length, 0)
    }
  }

  /**
   * Stop the compliance service
   */
  async stop() {
    console.log('🛑 Stopping ComplianceService...')
    
    this.userProfiles.clear()
    this.transactionLogs.clear()
    
    console.log('✅ ComplianceService stopped')
    this.emit('stopped')
  }
}

export default ComplianceService