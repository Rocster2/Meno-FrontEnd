/**
 * NotificationService - Real-time notification system
 * Handles WebSocket connections, push notifications, and email alerts
 */

import EventEmitter from 'events'

class NotificationService extends EventEmitter {
  constructor() {
    super()
    this.wsConnections = new Map() // userId -> WebSocket connection
    this.userPreferences = new Map() // userId -> notification preferences
    this.notificationQueue = []
    this.processingQueue = false
    
    // Notification statistics
    this.stats = {
      totalNotifications: 0,
      websocketNotifications: 0,
      emailNotifications: 0,
      pushNotifications: 0,
      failedNotifications: 0,
      activeConnections: 0
    }
    
    // Notification templates
    this.templates = new Map()
    this.initializeTemplates()
    
    // Rate limiting
    this.rateLimits = new Map() // userId -> { count, resetTime }
    this.maxNotificationsPerMinute = 10
  }

  /**
   * Initialize notification templates
   */
  initializeTemplates() {
    // NFT Listing Templates
    this.templates.set('nft_listed', {
      title: 'NFT Listed Successfully',
      message: 'Your NFT "{nftName}" has been listed for {price} ETH',
      type: 'success',
      category: 'marketplace'
    })
    
    this.templates.set('nft_sold', {
      title: 'NFT Sold! 🎉',
      message: 'Your NFT "{nftName}" sold for {price} ETH to {buyer}',
      type: 'success',
      category: 'marketplace'
    })
    
    this.templates.set('nft_purchased', {
      title: 'NFT Purchase Confirmed',
      message: 'You successfully purchased "{nftName}" for {price} ETH',
      type: 'success',
      category: 'marketplace'
    })
    
    this.templates.set('listing_expired', {
      title: 'Listing Expired',
      message: 'Your listing for "{nftName}" has expired. Relist to continue selling.',
      type: 'warning',
      category: 'marketplace'
    })
    
    // Fiat Conversion Templates
    this.templates.set('conversion_requested', {
      title: 'Fiat Conversion Requested',
      message: 'Your request to convert {amount} ETH to {currency} is being processed',
      type: 'info',
      category: 'fiat'
    })
    
    this.templates.set('conversion_completed', {
      title: 'Fiat Conversion Completed ✅',
      message: '{fiatAmount} {currency} has been sent to your bank account',
      type: 'success',
      category: 'fiat'
    })
    
    this.templates.set('conversion_failed', {
      title: 'Fiat Conversion Failed',
      message: 'Your conversion request failed: {reason}. Funds have been refunded.',
      type: 'error',
      category: 'fiat'
    })
    
    // Sync Templates
    this.templates.set('sync_completed', {
      title: 'Marketplace Sync Complete',
      message: 'Your listing has been synchronized across all platforms',
      type: 'info',
      category: 'sync'
    })
    
    this.templates.set('sync_failed', {
      title: 'Sync Issue Detected',
      message: 'There was an issue syncing your listing. Please check your dashboard.',
      type: 'warning',
      category: 'sync'
    })
    
    // Price Alert Templates
    this.templates.set('price_alert', {
      title: 'Price Alert',
      message: '"{nftName}" price changed from {oldPrice} to {newPrice} ETH',
      type: 'info',
      category: 'alerts'
    })
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      console.log('🔔 Initializing NotificationService...')
      
      // Start notification queue processor
      this.startNotificationProcessor()
      
      // Setup cleanup intervals
      this.setupCleanupIntervals()
      
      console.log('✅ NotificationService initialized successfully')
      this.emit('initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Setup WebSocket server for real-time notifications
   */
  setupWebSocketServer(server) {
    const WebSocket = require('ws')
    this.wss = new WebSocket.Server({ server })
    
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection')
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message)
          this.handleWebSocketMessage(ws, data)
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error)
          ws.send(JSON.stringify({ error: 'Invalid message format' }))
        }
      })
      
      ws.on('close', () => {
        this.handleWebSocketDisconnect(ws)
      })
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
      })
    })
    
    console.log('🌐 WebSocket server setup complete')
  }

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'auth':
        this.authenticateWebSocket(ws, data.token, data.userId)
        break
      case 'subscribe':
        this.subscribeToNotifications(ws, data.categories)
        break
      case 'unsubscribe':
        this.unsubscribeFromNotifications(ws, data.categories)
        break
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }))
    }
  }

  /**
   * Authenticate WebSocket connection
   */
  authenticateWebSocket(ws, token, userId) {
    // In production, verify JWT token here
    if (this.verifyToken(token, userId)) {
      ws.userId = userId
      ws.authenticated = true
      ws.subscriptions = new Set(['marketplace', 'fiat', 'sync']) // Default subscriptions
      
      this.wsConnections.set(userId, ws)
      this.stats.activeConnections++
      
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'WebSocket authenticated successfully'
      }))
      
      console.log(`✅ WebSocket authenticated for user: ${userId}`)
    } else {
      ws.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Invalid authentication token'
      }))
      ws.close()
    }
  }

  /**
   * Verify authentication token (placeholder)
   */
  verifyToken(token, userId) {
    // In production, implement proper JWT verification
    return token && userId
  }

  /**
   * Subscribe to notification categories
   */
  subscribeToNotifications(ws, categories) {
    if (!ws.authenticated) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }))
      return
    }
    
    categories.forEach(category => ws.subscriptions.add(category))
    
    ws.send(JSON.stringify({
      type: 'subscription_updated',
      subscriptions: Array.from(ws.subscriptions)
    }))
  }

  /**
   * Unsubscribe from notification categories
   */
  unsubscribeFromNotifications(ws, categories) {
    if (!ws.authenticated) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }))
      return
    }
    
    categories.forEach(category => ws.subscriptions.delete(category))
    
    ws.send(JSON.stringify({
      type: 'subscription_updated',
      subscriptions: Array.from(ws.subscriptions)
    }))
  }

  /**
   * Handle WebSocket disconnect
   */
  handleWebSocketDisconnect(ws) {
    if (ws.userId) {
      this.wsConnections.delete(ws.userId)
      this.stats.activeConnections--
      console.log(`🔌 WebSocket disconnected for user: ${ws.userId}`)
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(userId, templateId, data = {}, options = {}) {
    try {
      // Check rate limiting
      if (this.isRateLimited(userId)) {
        console.warn(`⚠️ Rate limit exceeded for user: ${userId}`)
        return false
      }
      
      // Get notification template
      const template = this.templates.get(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }
      
      // Create notification object
      const notification = {
        id: this.generateNotificationId(),
        userId,
        templateId,
        title: this.interpolateTemplate(template.title, data),
        message: this.interpolateTemplate(template.message, data),
        type: template.type,
        category: template.category,
        data,
        timestamp: Date.now(),
        read: false,
        ...options
      }
      
      // Queue notification for processing
      this.queueNotification(notification)
      
      this.stats.totalNotifications++
      return notification.id
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error)
      this.stats.failedNotifications++
      throw error
    }
  }

  /**
   * Queue notification for processing
   */
  queueNotification(notification) {
    this.notificationQueue.push(notification)
    
    if (!this.processingQueue) {
      this.processNotificationQueue()
    }
  }

  /**
   * Start notification queue processor
   */
  startNotificationProcessor() {
    setInterval(() => {
      if (!this.processingQueue && this.notificationQueue.length > 0) {
        this.processNotificationQueue()
      }
    }, 100) // Process every 100ms
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    if (this.processingQueue || this.notificationQueue.length === 0) {
      return
    }

    this.processingQueue = true

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift()
        
        try {
          await this.deliverNotification(notification)
        } catch (error) {
          console.error(`❌ Failed to deliver notification ${notification.id}:`, error)
          
          // Retry logic
          if (!notification.retryCount) notification.retryCount = 0
          if (notification.retryCount < 3) {
            notification.retryCount++
            this.notificationQueue.push(notification)
          }
        }
      }
    } finally {
      this.processingQueue = false
    }
  }

  /**
   * Deliver notification through available channels
   */
  async deliverNotification(notification) {
    const userPrefs = this.getUserPreferences(notification.userId)
    const deliveryPromises = []
    
    // WebSocket delivery (real-time)
    if (userPrefs.websocket && this.wsConnections.has(notification.userId)) {
      deliveryPromises.push(this.deliverWebSocketNotification(notification))
    }
    
    // Email delivery
    if (userPrefs.email && this.shouldSendEmail(notification)) {
      deliveryPromises.push(this.deliverEmailNotification(notification))
    }
    
    // Push notification delivery
    if (userPrefs.push && this.shouldSendPush(notification)) {
      deliveryPromises.push(this.deliverPushNotification(notification))
    }
    
    // Wait for all deliveries to complete
    const results = await Promise.allSettled(deliveryPromises)
    
    // Log delivery results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Notification delivery failed:`, result.reason)
      }
    })
    
    // Store notification in database (if needed)
    await this.storeNotification(notification)
    
    console.log(`✅ Notification delivered: ${notification.id}`)
  }

  /**
   * Deliver WebSocket notification
   */
  async deliverWebSocketNotification(notification) {
    const ws = this.wsConnections.get(notification.userId)
    
    if (!ws || !ws.subscriptions.has(notification.category)) {
      return false
    }
    
    const message = {
      type: 'notification',
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      notificationType: notification.type,
      timestamp: notification.timestamp,
      data: notification.data
    }
    
    ws.send(JSON.stringify(message))
    this.stats.websocketNotifications++
    
    return true
  }

  /**
   * Deliver email notification
   */
  async deliverEmailNotification(notification) {
    // In production, integrate with email service (SendGrid, etc.)
    console.log(`📧 Email notification sent to user ${notification.userId}: ${notification.title}`)
    this.stats.emailNotifications++
    
    // Placeholder for actual email delivery
    return true
  }

  /**
   * Deliver push notification
   */
  async deliverPushNotification(notification) {
    // In production, integrate with push service (FCM, APNS, etc.)
    console.log(`📱 Push notification sent to user ${notification.userId}: ${notification.title}`)
    this.stats.pushNotifications++
    
    // Placeholder for actual push delivery
    return true
  }

  /**
   * Store notification in database
   */
  async storeNotification(notification) {
    // In production, store in database for notification history
    // This allows users to view past notifications
    return true
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {
      websocket: true,
      email: true,
      push: true,
      categories: ['marketplace', 'fiat', 'sync', 'alerts']
    }
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(userId, preferences) {
    const currentPrefs = this.getUserPreferences(userId)
    const updatedPrefs = { ...currentPrefs, ...preferences }
    
    this.userPreferences.set(userId, updatedPrefs)
    
    // Update WebSocket subscriptions if user is connected
    const ws = this.wsConnections.get(userId)
    if (ws && ws.authenticated) {
      ws.subscriptions = new Set(updatedPrefs.categories)
      ws.send(JSON.stringify({
        type: 'preferences_updated',
        preferences: updatedPrefs
      }))
    }
    
    console.log(`✅ Updated notification preferences for user: ${userId}`)
    return updatedPrefs
  }

  /**
   * Check if user is rate limited
   */
  isRateLimited(userId) {
    const now = Date.now()
    const userLimit = this.rateLimits.get(userId)
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      })
      return false
    }
    
    if (userLimit.count >= this.maxNotificationsPerMinute) {
      return true
    }
    
    userLimit.count++
    return false
  }

  /**
   * Determine if email should be sent
   */
  shouldSendEmail(notification) {
    // Send email for important notifications or if user prefers email
    const importantTypes = ['error', 'success']
    const importantCategories = ['fiat', 'marketplace']
    
    return importantTypes.includes(notification.type) || 
           importantCategories.includes(notification.category)
  }

  /**
   * Determine if push notification should be sent
   */
  shouldSendPush(notification) {
    // Send push for urgent notifications
    const urgentTypes = ['error', 'success']
    return urgentTypes.includes(notification.type)
  }

  /**
   * Interpolate template with data
   */
  interpolateTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match
    })
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Setup cleanup intervals
   */
  setupCleanupIntervals() {
    // Clean up rate limits every 5 minutes
    setInterval(() => {
      const now = Date.now()
      for (const [userId, limit] of this.rateLimits) {
        if (now > limit.resetTime) {
          this.rateLimits.delete(userId)
        }
      }
    }, 300000) // 5 minutes
    
    // Clean up inactive WebSocket connections
    setInterval(() => {
      for (const [userId, ws] of this.wsConnections) {
        if (ws.readyState === ws.CLOSED) {
          this.wsConnections.delete(userId)
          this.stats.activeConnections--
        }
      }
    }, 60000) // 1 minute
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(userIds, templateId, data = {}, options = {}) {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, templateId, data, options)
    )
    
    const results = await Promise.allSettled(promises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`📢 Bulk notifications sent: ${successful} successful, ${failed} failed`)
    
    return { successful, failed, results }
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      ...this.stats,
      queuedNotifications: this.notificationQueue.length,
      rateLimitedUsers: this.rateLimits.size,
      connectedUsers: this.wsConnections.size
    }
  }

  /**
   * Get user's notification history
   */
  async getUserNotifications(userId, limit = 50, offset = 0) {
    // In production, fetch from database
    // For now, return empty array
    return {
      notifications: [],
      total: 0,
      unread: 0
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId, notificationId) {
    // In production, update database
    console.log(`✅ Marked notification ${notificationId} as read for user ${userId}`)
    return true
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    // In production, update database
    console.log(`✅ Marked all notifications as read for user ${userId}`)
    return true
  }

  /**
   * Stop notification service
   */
  async stop() {
    console.log('🛑 Stopping NotificationService...')
    
    // Close all WebSocket connections
    for (const ws of this.wsConnections.values()) {
      ws.close()
    }
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close()
    }
    
    // Clear queues and maps
    this.notificationQueue.length = 0
    this.wsConnections.clear()
    this.userPreferences.clear()
    this.rateLimits.clear()
    
    console.log('✅ NotificationService stopped')
    this.emit('stopped')
  }
}

export default NotificationService