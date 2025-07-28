/**
 * SyncManager - Cross-platform marketplace synchronization
 * Coordinates listing synchronization between Meno and Morph's official marketplace
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { morphMainnet, morphTestnet, getContractAddress, getCurrentNetwork } from '../network-config'
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

// Marketplace contract ABI for synchronization operations
const MARKETPLACE_ABI = parseAbi([
  'function listNFT(address nftContract, uint256 tokenId, uint256 price, uint256 duration, bool enableFiatOffRamp) external returns (bytes32)',
  'function updatePrice(bytes32 listingId, uint256 newPrice) external',
  'function cancelListing(bytes32 listingId) external',
  'function syncWithExternalMarketplace(bytes32 listingId, address externalMarketplace, bytes32 externalListingId) external',
  'function markSoldExternally(bytes32 listingId, address buyer, uint256 salePrice) external',
  'function getListing(bytes32 listingId) external view returns ((bytes32,address,address,uint256,uint256,uint256,uint256,bool,bool,address,bytes32))',
  'function isListingActive(bytes32 listingId) external view returns (bool)'
])

class SyncManager extends EventEmitter {
  constructor(eventListenerService) {
    super()
    this.eventListener = eventListenerService
    this.clients = new Map()
    this.syncQueue = []
    this.processingSyncQueue = false
    this.conflictResolutionStrategies = new Map()
    
    // Sync statistics
    this.stats = {
      syncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      lastSyncTime: null,
      averageSyncTime: 0
    }
    
    // Sync status tracking
    this.syncStatus = new Map() // listingId -> SyncStatus
    
    // Initialize conflict resolution strategies
    this.initializeConflictResolution()
    
    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Initialize the sync manager
   */
  async initialize() {
    try {
      console.log('🔄 Initializing SyncManager...')
      
      // Initialize blockchain clients
      await this.initializeClients()
      
      // Start sync queue processor
      this.startSyncProcessor()
      
      console.log('✅ SyncManager initialized successfully')
      this.emit('initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize SyncManager:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Initialize blockchain clients
   */
  async initializeClients() {
    const networks = [
      { name: 'mainnet', config: morphMainnet },
      { name: 'testnet', config: morphTestnet }
    ]

    for (const network of networks) {
      try {
        const client = createPublicClient({
          chain: network.config,
          transport: http(network.config.rpcUrls.default.http[0])
        })

        this.clients.set(network.name, client)
        console.log(`✅ Sync client initialized for ${network.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to initialize sync client for ${network.name}:`, error)
        throw error
      }
    }
  }

  /**
   * Setup event listeners from EventListenerService
   */
  setupEventListeners() {
    if (!this.eventListener) {
      console.warn('⚠️ EventListenerService not provided, sync will be limited')
      return
    }

    // Listen to marketplace events for synchronization
    this.eventListener.on('nftListed', (event) => this.handleNFTListed(event))
    this.eventListener.on('nftSold', (event) => this.handleNFTSold(event))
    this.eventListener.on('priceUpdated', (event) => this.handlePriceUpdated(event))
    this.eventListener.on('listingCancelled', (event) => this.handleListingCancelled(event))
    
    console.log('🎧 Event listeners setup for synchronization')
  }

  /**
   * Initialize conflict resolution strategies
   */
  initializeConflictResolution() {
    // Strategy: Latest timestamp wins
    this.conflictResolutionStrategies.set('timestamp', (local, external) => {
      return local.timestamp > external.timestamp ? local : external
    })
    
    // Strategy: Higher price wins (for price conflicts)
    this.conflictResolutionStrategies.set('higher_price', (local, external) => {
      return local.price > external.price ? local : external
    })
    
    // Strategy: Seller preference (seller's platform wins)
    this.conflictResolutionStrategies.set('seller_preference', (local, external, context) => {
      return context.sellerPreference === 'meno' ? local : external
    })
    
    // Strategy: First come first served
    this.conflictResolutionStrategies.set('first_come', (local, external) => {
      return local.createdAt < external.createdAt ? local : external
    })
  }

  /**
   * Handle NFT listed event
   */
  async handleNFTListed(event) {
    console.log(`📝 Handling NFT listed: ${event.listingId}`)
    
    const syncOperation = {
      type: 'create_listing',
      listingId: event.listingId,
      sourceNetwork: event.network,
      data: event,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.queueSyncOperation(syncOperation)
  }

  /**
   * Handle NFT sold event
   */
  async handleNFTSold(event) {
    console.log(`💰 Handling NFT sold: ${event.listingId}`)
    
    const syncOperation = {
      type: 'mark_sold',
      listingId: event.listingId,
      sourceNetwork: event.network,
      data: event,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.queueSyncOperation(syncOperation)
  }

  /**
   * Handle price updated event
   */
  async handlePriceUpdated(event) {
    console.log(`💲 Handling price updated: ${event.listingId}`)
    
    const syncOperation = {
      type: 'update_price',
      listingId: event.listingId,
      sourceNetwork: event.network,
      data: event,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.queueSyncOperation(syncOperation)
  }

  /**
   * Handle listing cancelled event
   */
  async handleListingCancelled(event) {
    console.log(`❌ Handling listing cancelled: ${event.listingId}`)
    
    const syncOperation = {
      type: 'cancel_listing',
      listingId: event.listingId,
      sourceNetwork: event.network,
      data: event,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.queueSyncOperation(syncOperation)
  }

  /**
   * Queue synchronization operation
   */
  queueSyncOperation(operation) {
    this.syncQueue.push(operation)
    this.stats.syncOperations++
    
    console.log(`📥 Queued sync operation: ${operation.type} for ${operation.listingId}`)
    
    // Update sync status
    this.updateSyncStatus(operation.listingId, 'queued', operation)
    
    // Process queue if not already processing
    if (!this.processingSyncQueue) {
      this.processSyncQueue()
    }
  }

  /**
   * Start sync queue processor
   */
  startSyncProcessor() {
    // Process sync operations every 500ms
    setInterval(() => {
      if (!this.processingSyncQueue && this.syncQueue.length > 0) {
        this.processSyncQueue()
      }
    }, 500)
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.processingSyncQueue || this.syncQueue.length === 0) {
      return
    }

    this.processingSyncQueue = true

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift()
        
        try {
          const startTime = Date.now()
          await this.processSyncOperation(operation)
          
          const syncTime = Date.now() - startTime
          this.updateAverageSyncTime(syncTime)
          this.stats.successfulSyncs++
          this.stats.lastSyncTime = Date.now()
          
          console.log(`✅ Sync operation completed: ${operation.type} (${syncTime}ms)`)
          
        } catch (error) {
          console.error(`❌ Sync operation failed: ${operation.type}`, error)
          this.stats.failedSyncs++
          
          // Retry logic with exponential backoff
          if (operation.retryCount < 3) {
            operation.retryCount++
            const delay = Math.pow(2, operation.retryCount) * 1000 // 2s, 4s, 8s
            
            setTimeout(() => {
              this.syncQueue.push(operation)
            }, delay)
            
            console.log(`🔄 Retrying sync operation in ${delay}ms (attempt ${operation.retryCount}/3)`)
          } else {
            console.error(`💀 Sync operation failed after 3 retries: ${operation.type}`)
            this.updateSyncStatus(operation.listingId, 'failed', operation, error)
            this.emit('syncFailed', { operation, error })
          }
        }
      }
    } finally {
      this.processingSyncQueue = false
    }
  }

  /**
   * Process individual sync operation
   */
  async processSyncOperation(operation) {
    console.log(`⚡ Processing sync operation: ${operation.type}`)
    
    this.updateSyncStatus(operation.listingId, 'processing', operation)
    
    switch (operation.type) {
      case 'create_listing':
        await this.syncCreateListing(operation)
        break
      case 'update_price':
        await this.syncUpdatePrice(operation)
        break
      case 'cancel_listing':
        await this.syncCancelListing(operation)
        break
      case 'mark_sold':
        await this.syncMarkSold(operation)
        break
      default:
        throw new Error(`Unknown sync operation type: ${operation.type}`)
    }
    
    this.updateSyncStatus(operation.listingId, 'completed', operation)
    this.emit('syncCompleted', operation)
  }

  /**
   * Sync create listing operation
   */
  async syncCreateListing(operation) {
    const { listingId, sourceNetwork, data } = operation
    
    // Get target networks (all networks except source)
    const targetNetworks = Array.from(this.clients.keys()).filter(net => net !== sourceNetwork)
    
    for (const targetNetwork of targetNetworks) {
      try {
        // Check if listing already exists on target network
        const existingListing = await this.getListingFromNetwork(targetNetwork, listingId)
        
        if (existingListing && existingListing.isActive) {
          // Conflict detected - resolve it
          await this.resolveListingConflict(listingId, sourceNetwork, targetNetwork, data, existingListing)
        } else {
          // Create listing on target network
          await this.createListingOnNetwork(targetNetwork, data)
        }
        
      } catch (error) {
        console.error(`❌ Failed to sync listing to ${targetNetwork}:`, error)
        throw error
      }
    }
  }

  /**
   * Sync update price operation
   */
  async syncUpdatePrice(operation) {
    const { listingId, sourceNetwork, data } = operation
    const targetNetworks = Array.from(this.clients.keys()).filter(net => net !== sourceNetwork)
    
    for (const targetNetwork of targetNetworks) {
      try {
        // Check if listing exists on target network
        const existingListing = await this.getListingFromNetwork(targetNetwork, listingId)
        
        if (existingListing && existingListing.isActive) {
          // Check for price conflicts
          if (existingListing.price !== data.oldPrice) {
            console.warn(`⚠️ Price conflict detected for ${listingId} on ${targetNetwork}`)
            await this.resolvePriceConflict(listingId, sourceNetwork, targetNetwork, data, existingListing)
          } else {
            // Update price on target network
            await this.updatePriceOnNetwork(targetNetwork, listingId, data.newPrice)
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to sync price update to ${targetNetwork}:`, error)
        throw error
      }
    }
  }

  /**
   * Sync cancel listing operation
   */
  async syncCancelListing(operation) {
    const { listingId, sourceNetwork } = operation
    const targetNetworks = Array.from(this.clients.keys()).filter(net => net !== sourceNetwork)
    
    for (const targetNetwork of targetNetworks) {
      try {
        // Cancel listing on target network
        await this.cancelListingOnNetwork(targetNetwork, listingId)
        
      } catch (error) {
        console.error(`❌ Failed to sync listing cancellation to ${targetNetwork}:`, error)
        throw error
      }
    }
  }

  /**
   * Sync mark sold operation
   */
  async syncMarkSold(operation) {
    const { listingId, sourceNetwork, data } = operation
    const targetNetworks = Array.from(this.clients.keys()).filter(net => net !== sourceNetwork)
    
    for (const targetNetwork of targetNetworks) {
      try {
        // Mark as sold on target network
        await this.markSoldOnNetwork(targetNetwork, listingId, data.buyer, data.price)
        
      } catch (error) {
        console.error(`❌ Failed to sync sale to ${targetNetwork}:`, error)
        throw error
      }
    }
  }

  /**
   * Get listing from specific network
   */
  async getListingFromNetwork(networkName, listingId) {
    const client = this.clients.get(networkName)
    const contractAddress = getContractAddress('menoMarketplace', 
      networkName === 'mainnet' ? morphMainnet.id : morphTestnet.id)
    
    if (!client || !contractAddress) {
      return null
    }

    try {
      const listing = await client.readContract({
        address: contractAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'getListing',
        args: [listingId]
      })
      
      return {
        listingId: listing[0],
        seller: listing[1],
        nftContract: listing[2],
        tokenId: listing[3],
        price: listing[4],
        createdAt: listing[5],
        expiresAt: listing[6],
        isActive: listing[7],
        fiatEnabled: listing[8],
        externalMarketplace: listing[9],
        externalListingId: listing[10]
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not get listing ${listingId} from ${networkName}:`, error.message)
      return null
    }
  }

  /**
   * Create listing on target network
   */
  async createListingOnNetwork(networkName, listingData) {
    // This would require a wallet client with appropriate permissions
    // For now, we'll emit an event for external handling
    this.emit('createListingRequired', {
      network: networkName,
      data: listingData
    })
    
    console.log(`📝 Create listing request sent for ${networkName}`)
  }

  /**
   * Update price on target network
   */
  async updatePriceOnNetwork(networkName, listingId, newPrice) {
    this.emit('updatePriceRequired', {
      network: networkName,
      listingId,
      newPrice
    })
    
    console.log(`💲 Update price request sent for ${networkName}`)
  }

  /**
   * Cancel listing on target network
   */
  async cancelListingOnNetwork(networkName, listingId) {
    this.emit('cancelListingRequired', {
      network: networkName,
      listingId
    })
    
    console.log(`❌ Cancel listing request sent for ${networkName}`)
  }

  /**
   * Mark listing as sold on target network
   */
  async markSoldOnNetwork(networkName, listingId, buyer, price) {
    this.emit('markSoldRequired', {
      network: networkName,
      listingId,
      buyer,
      price
    })
    
    console.log(`💰 Mark sold request sent for ${networkName}`)
  }

  /**
   * Resolve listing conflict
   */
  async resolveListingConflict(listingId, sourceNetwork, targetNetwork, sourceData, targetData) {
    console.log(`⚔️ Resolving listing conflict for ${listingId}`)
    
    const strategy = this.conflictResolutionStrategies.get('timestamp')
    const winner = strategy(sourceData, targetData)
    
    if (winner === sourceData) {
      // Source wins - update target
      await this.updateListingOnNetwork(targetNetwork, listingId, sourceData)
    } else {
      // Target wins - update source
      await this.updateListingOnNetwork(sourceNetwork, listingId, targetData)
    }
    
    this.stats.conflictsResolved++
    this.emit('conflictResolved', {
      listingId,
      sourceNetwork,
      targetNetwork,
      winner: winner === sourceData ? 'source' : 'target'
    })
  }

  /**
   * Resolve price conflict
   */
  async resolvePriceConflict(listingId, sourceNetwork, targetNetwork, sourceData, targetData) {
    console.log(`💲 Resolving price conflict for ${listingId}`)
    
    const strategy = this.conflictResolutionStrategies.get('timestamp')
    const winner = strategy(sourceData, targetData)
    
    if (winner === sourceData) {
      // Source wins - update target price
      await this.updatePriceOnNetwork(targetNetwork, listingId, sourceData.newPrice)
    }
    // If target wins, no action needed as source update is ignored
    
    this.stats.conflictsResolved++
    this.emit('priceConflictResolved', {
      listingId,
      sourceNetwork,
      targetNetwork,
      winningPrice: winner === sourceData ? sourceData.newPrice : targetData.price
    })
  }

  /**
   * Update listing on network
   */
  async updateListingOnNetwork(networkName, listingId, listingData) {
    this.emit('updateListingRequired', {
      network: networkName,
      listingId,
      data: listingData
    })
  }

  /**
   * Update sync status
   */
  updateSyncStatus(listingId, status, operation, error = null) {
    this.syncStatus.set(listingId, {
      status,
      operation,
      error,
      timestamp: Date.now()
    })
    
    this.emit('syncStatusUpdated', {
      listingId,
      status,
      operation,
      error
    })
  }

  /**
   * Update average sync time
   */
  updateAverageSyncTime(syncTime) {
    if (this.stats.averageSyncTime === 0) {
      this.stats.averageSyncTime = syncTime
    } else {
      this.stats.averageSyncTime = (this.stats.averageSyncTime + syncTime) / 2
    }
  }

  /**
   * Get sync status for a listing
   */
  getSyncStatus(listingId) {
    return this.syncStatus.get(listingId) || { status: 'unknown' }
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses() {
    return Object.fromEntries(this.syncStatus)
  }

  /**
   * Force sync a specific listing
   */
  async forceSyncListing(listingId, sourceNetwork) {
    try {
      const listingData = await this.getListingFromNetwork(sourceNetwork, listingId)
      
      if (!listingData) {
        throw new Error(`Listing ${listingId} not found on ${sourceNetwork}`)
      }
      
      const syncOperation = {
        type: 'force_sync',
        listingId,
        sourceNetwork,
        data: listingData,
        timestamp: Date.now(),
        retryCount: 0
      }
      
      this.queueSyncOperation(syncOperation)
      
    } catch (error) {
      console.error(`❌ Failed to force sync listing ${listingId}:`, error)
      throw error
    }
  }

  /**
   * Ensure consistency across all networks
   */
  async ensureConsistency() {
    console.log('🔍 Checking consistency across networks...')
    
    const inconsistencies = []
    const networks = Array.from(this.clients.keys())
    
    // This would involve comparing listings across networks
    // and identifying inconsistencies for resolution
    
    for (const [listingId, syncStatus] of this.syncStatus) {
      if (syncStatus.status === 'failed') {
        inconsistencies.push({
          listingId,
          issue: 'sync_failed',
          details: syncStatus
        })
      }
    }
    
    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      checkedAt: Date.now()
    }
  }

  /**
   * Get sync manager statistics
   */
  getStats() {
    return {
      ...this.stats,
      queuedOperations: this.syncQueue.length,
      trackedListings: this.syncStatus.size,
      isProcessing: this.processingSyncQueue,
      connectedNetworks: Array.from(this.clients.keys())
    }
  }

  /**
   * Stop sync manager
   */
  async stop() {
    console.log('🛑 Stopping SyncManager...')
    
    this.processingSyncQueue = false
    this.syncQueue.length = 0
    this.syncStatus.clear()
    this.clients.clear()
    
    console.log('✅ SyncManager stopped')
    this.emit('stopped')
  }
}

export default SyncManager