/**
 * EventListenerService - Real-time blockchain event monitoring
 * Monitors Morph marketplace events for cross-platform synchronization
 */

import { createPublicClient, webSocket, http, parseAbi } from 'viem'
import { morphMainnet, morphTestnet } from '../network-config'
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

// Marketplace contract ABI for event listening
const MARKETPLACE_ABI = parseAbi([
  'event NFTListed(bytes32 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool fiatEnabled)',
  'event NFTSold(bytes32 indexed listingId, address indexed buyer, address indexed seller, address nftContract, uint256 tokenId, uint256 price, uint256 platformFeeAmount)',
  'event PriceUpdated(bytes32 indexed listingId, uint256 oldPrice, uint256 newPrice)',
  'event ListingCancelled(bytes32 indexed listingId, address indexed seller)',
  'event ListingExpired(bytes32 indexed listingId, address indexed seller)',
  'event FiatConversionRequested(bytes32 indexed listingId, address indexed seller, uint256 amount)',
  'event ExternalMarketplaceSync(bytes32 indexed listingId, address indexed externalMarketplace, bytes32 externalListingId)'
])

// Fiat off-ramp contract ABI for event listening
const FIAT_OFFRAMP_ABI = parseAbi([
  'event ConversionRequested(bytes32 indexed requestId, address indexed user, uint256 amount, string currency, address preferredProvider)',
  'event ConversionAssigned(bytes32 indexed requestId, address indexed provider, uint256 exchangeRate, uint256 fiatAmount, uint256 fees)',
  'event ConversionCompleted(bytes32 indexed requestId, address indexed user, address indexed provider, uint256 amount, uint256 fiatAmount)',
  'event ConversionFailed(bytes32 indexed requestId, address indexed user, address indexed provider, string reason)',
  'event ConversionCancelled(bytes32 indexed requestId, address indexed user)'
])

class EventListenerService extends EventEmitter {
  constructor() {
    super()
    this.clients = new Map()
    this.subscriptions = new Map()
    this.isListening = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // Start with 1 second
    this.eventQueue = []
    this.processingQueue = false
    
    // Event processing statistics
    this.stats = {
      eventsProcessed: 0,
      eventsQueued: 0,
      reconnections: 0,
      lastEventTime: null,
      errors: 0
    }
  }

  /**
   * Initialize event listeners for both networks
   */
  async initialize() {
    try {
      console.log('🎧 Initializing EventListenerService...')
      
      // Initialize clients for both networks
      await this.initializeClients()
      
      // Start listening to events
      await this.startListening()
      
      // Start event queue processor
      this.startEventProcessor()
      
      console.log('✅ EventListenerService initialized successfully')
      this.emit('initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize EventListenerService:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Initialize blockchain clients for both networks
   */
  async initializeClients() {
    const networks = [
      { name: 'mainnet', config: morphMainnet },
      { name: 'testnet', config: morphTestnet }
    ]

    for (const network of networks) {
      try {
        // Try WebSocket first for real-time events, fallback to HTTP
        let client
        const wsRpc = network.config.rpcUrls.default.http[0].replace('https://', 'wss://').replace('http://', 'ws://')
        
        try {
          client = createPublicClient({
            chain: network.config,
            transport: webSocket(wsRpc, {
              reconnect: {
                attempts: this.maxReconnectAttempts,
                delay: this.reconnectDelay
              }
            })
          })
          console.log(`🔗 WebSocket client created for ${network.name}`)
        } catch (wsError) {
          console.warn(`⚠️ WebSocket failed for ${network.name}, using HTTP:`, wsError.message)
          client = createPublicClient({
            chain: network.config,
            transport: http(network.config.rpcUrls.default.http[0])
          })
        }

        this.clients.set(network.name, client)
        console.log(`✅ Client initialized for ${network.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to initialize client for ${network.name}:`, error)
        throw error
      }
    }
  }

  /**
   * Start listening to blockchain events
   */
  async startListening() {
    if (this.isListening) {
      console.log('👂 Already listening to events')
      return
    }

    this.isListening = true
    console.log('🎧 Starting event listeners...')

    for (const [networkName, client] of this.clients) {
      try {
        await this.setupNetworkListeners(networkName, client)
        console.log(`✅ Event listeners started for ${networkName}`)
      } catch (error) {
        console.error(`❌ Failed to start listeners for ${networkName}:`, error)
        this.handleConnectionError(networkName, error)
      }
    }
  }

  /**
   * Setup event listeners for a specific network
   */
  async setupNetworkListeners(networkName, client) {
    const network = networkName === 'mainnet' ? morphMainnet : morphTestnet
    const contractAddresses = network.contracts

    // Listen to Marketplace events
    if (contractAddresses.menoMarketplace?.address) {
      await this.setupMarketplaceListeners(networkName, client, contractAddresses.menoMarketplace.address)
    }

    // Listen to Fiat Off-ramp events
    if (contractAddresses.fiatOffRamp?.address) {
      await this.setupFiatOffRampListeners(networkName, client, contractAddresses.fiatOffRamp.address)
    }

    // Listen to external marketplace events (if configured)
    if (contractAddresses.morphOfficialMarketplace?.address) {
      await this.setupExternalMarketplaceListeners(networkName, client, contractAddresses.morphOfficialMarketplace.address)
    }
  }

  /**
   * Setup marketplace event listeners
   */
  async setupMarketplaceListeners(networkName, client, contractAddress) {
    const events = [
      'NFTListed',
      'NFTSold', 
      'PriceUpdated',
      'ListingCancelled',
      'ListingExpired',
      'FiatConversionRequested',
      'ExternalMarketplaceSync'
    ]

    for (const eventName of events) {
      try {
        const unwatch = client.watchContractEvent({
          address: contractAddress,
          abi: MARKETPLACE_ABI,
          eventName,
          onLogs: (logs) => this.handleMarketplaceEvent(networkName, eventName, logs),
          onError: (error) => this.handleEventError(networkName, eventName, error)
        })

        const subscriptionKey = `${networkName}-marketplace-${eventName}`
        this.subscriptions.set(subscriptionKey, unwatch)
        
      } catch (error) {
        console.error(`❌ Failed to setup ${eventName} listener for ${networkName}:`, error)
      }
    }
  }

  /**
   * Setup fiat off-ramp event listeners
   */
  async setupFiatOffRampListeners(networkName, client, contractAddress) {
    const events = [
      'ConversionRequested',
      'ConversionAssigned',
      'ConversionCompleted',
      'ConversionFailed',
      'ConversionCancelled'
    ]

    for (const eventName of events) {
      try {
        const unwatch = client.watchContractEvent({
          address: contractAddress,
          abi: FIAT_OFFRAMP_ABI,
          eventName,
          onLogs: (logs) => this.handleFiatOffRampEvent(networkName, eventName, logs),
          onError: (error) => this.handleEventError(networkName, eventName, error)
        })

        const subscriptionKey = `${networkName}-fiat-${eventName}`
        this.subscriptions.set(subscriptionKey, unwatch)
        
      } catch (error) {
        console.error(`❌ Failed to setup ${eventName} listener for ${networkName}:`, error)
      }
    }
  }

  /**
   * Setup external marketplace event listeners
   */
  async setupExternalMarketplaceListeners(networkName, client, contractAddress) {
    // This would listen to Morph's official marketplace events
    // Implementation depends on their contract ABI
    console.log(`🔗 Setting up external marketplace listeners for ${networkName}`)
    
    // Placeholder for external marketplace event listening
    // Would be implemented based on Morph's official marketplace contract
  }

  /**
   * Handle marketplace events
   */
  handleMarketplaceEvent(networkName, eventName, logs) {
    for (const log of logs) {
      const event = {
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'marketplace',
        name: eventName,
        network: networkName,
        contractAddress: log.address,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        logIndex: log.logIndex,
        args: log.args,
        timestamp: Date.now(),
        processed: false
      }

      this.queueEvent(event)
    }
  }

  /**
   * Handle fiat off-ramp events
   */
  handleFiatOffRampEvent(networkName, eventName, logs) {
    for (const log of logs) {
      const event = {
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'fiat-offramp',
        name: eventName,
        network: networkName,
        contractAddress: log.address,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        logIndex: log.logIndex,
        args: log.args,
        timestamp: Date.now(),
        processed: false
      }

      this.queueEvent(event)
    }
  }

  /**
   * Queue event for processing
   */
  queueEvent(event) {
    this.eventQueue.push(event)
    this.stats.eventsQueued++
    this.stats.lastEventTime = event.timestamp
    
    console.log(`📥 Queued ${event.type} event: ${event.name} (${event.network})`)
    
    // Emit event immediately for real-time listeners
    this.emit('event', event)
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      this.processEventQueue()
    }
  }

  /**
   * Start event queue processor
   */
  startEventProcessor() {
    // Process events every 100ms
    setInterval(() => {
      if (!this.processingQueue && this.eventQueue.length > 0) {
        this.processEventQueue()
      }
    }, 100)
  }

  /**
   * Process queued events
   */
  async processEventQueue() {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return
    }

    this.processingQueue = true

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()
        
        try {
          await this.processEvent(event)
          this.stats.eventsProcessed++
          
        } catch (error) {
          console.error(`❌ Failed to process event ${event.id}:`, error)
          this.stats.errors++
          
          // Re-queue event for retry (with limit)
          if (!event.retryCount) event.retryCount = 0
          if (event.retryCount < 3) {
            event.retryCount++
            this.eventQueue.push(event)
          } else {
            console.error(`💀 Event ${event.id} failed after 3 retries, dropping`)
          }
        }
      }
    } finally {
      this.processingQueue = false
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    console.log(`⚡ Processing ${event.type} event: ${event.name}`)
    
    // Emit processed event for other services to handle
    this.emit('processedEvent', event)
    
    // Handle specific event types
    switch (event.type) {
      case 'marketplace':
        await this.processMarketplaceEvent(event)
        break
      case 'fiat-offramp':
        await this.processFiatOffRampEvent(event)
        break
      default:
        console.warn(`⚠️ Unknown event type: ${event.type}`)
    }
    
    event.processed = true
    event.processedAt = Date.now()
  }

  /**
   * Process marketplace events
   */
  async processMarketplaceEvent(event) {
    switch (event.name) {
      case 'NFTListed':
        this.emit('nftListed', {
          listingId: event.args.listingId,
          seller: event.args.seller,
          nftContract: event.args.nftContract,
          tokenId: event.args.tokenId,
          price: event.args.price,
          expiresAt: event.args.expiresAt,
          fiatEnabled: event.args.fiatEnabled,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'NFTSold':
        this.emit('nftSold', {
          listingId: event.args.listingId,
          buyer: event.args.buyer,
          seller: event.args.seller,
          nftContract: event.args.nftContract,
          tokenId: event.args.tokenId,
          price: event.args.price,
          platformFeeAmount: event.args.platformFeeAmount,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'PriceUpdated':
        this.emit('priceUpdated', {
          listingId: event.args.listingId,
          oldPrice: event.args.oldPrice,
          newPrice: event.args.newPrice,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'ListingCancelled':
        this.emit('listingCancelled', {
          listingId: event.args.listingId,
          seller: event.args.seller,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'FiatConversionRequested':
        this.emit('fiatConversionRequested', {
          listingId: event.args.listingId,
          seller: event.args.seller,
          amount: event.args.amount,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break
    }
  }

  /**
   * Process fiat off-ramp events
   */
  async processFiatOffRampEvent(event) {
    switch (event.name) {
      case 'ConversionRequested':
        this.emit('conversionRequested', {
          requestId: event.args.requestId,
          user: event.args.user,
          amount: event.args.amount,
          currency: event.args.currency,
          preferredProvider: event.args.preferredProvider,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'ConversionCompleted':
        this.emit('conversionCompleted', {
          requestId: event.args.requestId,
          user: event.args.user,
          provider: event.args.provider,
          amount: event.args.amount,
          fiatAmount: event.args.fiatAmount,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break

      case 'ConversionFailed':
        this.emit('conversionFailed', {
          requestId: event.args.requestId,
          user: event.args.user,
          provider: event.args.provider,
          reason: event.args.reason,
          network: event.network,
          transactionHash: event.transactionHash
        })
        break
    }
  }

  /**
   * Handle event processing errors
   */
  handleEventError(networkName, eventName, error) {
    console.error(`❌ Event error for ${eventName} on ${networkName}:`, error)
    this.stats.errors++
    this.emit('eventError', { networkName, eventName, error })
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  handleConnectionError(networkName, error) {
    console.error(`🔌 Connection error for ${networkName}:`, error)
    this.stats.reconnections++
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
      
      console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${networkName} in ${delay}ms`)
      
      setTimeout(async () => {
        try {
          await this.reconnectNetwork(networkName)
          this.reconnectAttempts = 0 // Reset on successful reconnection
        } catch (reconnectError) {
          console.error(`❌ Reconnection failed for ${networkName}:`, reconnectError)
          this.handleConnectionError(networkName, reconnectError)
        }
      }, delay)
    } else {
      console.error(`💀 Max reconnection attempts reached for ${networkName}`)
      this.emit('maxReconnectAttemptsReached', { networkName, error })
    }
  }

  /**
   * Reconnect to a specific network
   */
  async reconnectNetwork(networkName) {
    console.log(`🔄 Reconnecting to ${networkName}...`)
    
    // Clean up existing subscriptions
    this.cleanupNetworkSubscriptions(networkName)
    
    // Reinitialize client
    const network = networkName === 'mainnet' ? morphMainnet : morphTestnet
    const client = createPublicClient({
      chain: network,
      transport: http(network.rpcUrls.default.http[0])
    })
    
    this.clients.set(networkName, client)
    
    // Restart listeners
    await this.setupNetworkListeners(networkName, client)
    
    console.log(`✅ Reconnected to ${networkName}`)
    this.emit('reconnected', { networkName })
  }

  /**
   * Clean up subscriptions for a network
   */
  cleanupNetworkSubscriptions(networkName) {
    for (const [key, unwatch] of this.subscriptions) {
      if (key.startsWith(networkName)) {
        try {
          unwatch()
          this.subscriptions.delete(key)
        } catch (error) {
          console.warn(`⚠️ Error cleaning up subscription ${key}:`, error)
        }
      }
    }
  }

  /**
   * Stop all event listeners
   */
  async stop() {
    console.log('🛑 Stopping EventListenerService...')
    
    this.isListening = false
    
    // Clean up all subscriptions
    for (const [key, unwatch] of this.subscriptions) {
      try {
        unwatch()
      } catch (error) {
        console.warn(`⚠️ Error stopping subscription ${key}:`, error)
      }
    }
    
    this.subscriptions.clear()
    this.clients.clear()
    this.eventQueue.length = 0
    
    console.log('✅ EventListenerService stopped')
    this.emit('stopped')
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isListening: this.isListening,
      activeSubscriptions: this.subscriptions.size,
      queuedEvents: this.eventQueue.length,
      connectedNetworks: Array.from(this.clients.keys()),
      uptime: this.stats.lastEventTime ? Date.now() - this.stats.lastEventTime : 0
    }
  }

  /**
   * Get historical events from blockchain
   */
  async getHistoricalEvents(networkName, contractAddress, eventName, fromBlock = 'earliest', toBlock = 'latest') {
    const client = this.clients.get(networkName)
    if (!client) {
      throw new Error(`Client not found for network: ${networkName}`)
    }

    try {
      const logs = await client.getLogs({
        address: contractAddress,
        event: MARKETPLACE_ABI.find(item => item.name === eventName),
        fromBlock,
        toBlock
      })

      return logs.map(log => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'marketplace',
        name: eventName,
        network: networkName,
        contractAddress: log.address,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        logIndex: log.logIndex,
        args: log.args,
        timestamp: Date.now(),
        historical: true
      }))
    } catch (error) {
      console.error(`❌ Failed to get historical events:`, error)
      throw error
    }
  }
}

export default EventListenerService