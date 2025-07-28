/**
 * NFT Data Service - Professional NFT data management
 * Handles both mock NFT data for demo and real blockchain NFT detection
 * Provides clear differentiation between mock and real data for production use
 */

import { createPublicClient, http } from 'viem'
import { getCurrentNetwork, getContractAddress } from '../network-config'

class NFTDetectionService {
  constructor() {
    this.client = null
    this.cache = new Map() // userAddress -> NFTs
    this.metadataCache = new Map() // contractAddress:tokenId -> metadata
    this.supportedCollections = new Map()
    this.refreshInterval = 300000 // 5 minutes
    this.lastRefresh = new Map() // userAddress -> timestamp
    
    // Professional data mode management
    this.dataMode = 'mock' // 'mock' or 'real'
    this.mockDataEnabled = true
    
    this.initializeClient()
    this.initializeSupportedCollections()
  }

  /**
   * Initialize blockchain client
   */
  initializeClient() {
    const network = getCurrentNetwork()
    this.client = createPublicClient({
      chain: network,
      transport: http(network.rpcUrls.default.http[0])
    })
  }

  /**
   * Initialize supported NFT collections
   */
  initializeSupportedCollections() {
    // Popular NFT collections on Morph (mock data - in production, fetch from API)
    this.supportedCollections.set('0x1234567890123456789012345678901234567890', {
      name: 'Morph Genesis',
      symbol: 'MGEN',
      type: 'ERC721',
      verified: true,
      floorPrice: 0.5,
      totalSupply: 10000,
      description: 'Genesis collection on Morph Layer 2'
    })
    
    this.supportedCollections.set('0x2345678901234567890123456789012345678901', {
      name: 'Morph Punks',
      symbol: 'MPUNK',
      type: 'ERC721',
      verified: true,
      floorPrice: 1.2,
      totalSupply: 5000,
      description: 'Punk-style NFTs on Morph'
    })
    
    this.supportedCollections.set('0x3456789012345678901234567890123456789012', {
      name: 'Morph Art',
      symbol: 'MART',
      type: 'ERC721',
      verified: true,
      floorPrice: 0.8,
      totalSupply: 8000,
      description: 'Digital art collection on Morph'
    })
  }

  /**
   * Set data mode (mock or real)
   */
  setDataMode(mode) {
    if (mode !== 'mock' && mode !== 'real') {
      throw new Error('Data mode must be either "mock" or "real"')
    }
    
    this.dataMode = mode
    this.mockDataEnabled = mode === 'mock'
    
    // Clear cache when switching modes
    this.clearCache()
    
    console.log(`🔄 Data mode switched to: ${mode.toUpperCase()}`)
  }

  /**
   * Get current data mode
   */
  getDataMode() {
    return {
      mode: this.dataMode,
      isMock: this.mockDataEnabled,
      description: this.mockDataEnabled ? 'Using mock data for demonstration' : 'Using real blockchain data'
    }
  }

  /**
   * Discover user's NFTs across supported collections
   */
  async discoverUserNFTs(userAddress) {
    try {
      console.log(`🔍 Discovering NFTs for ${userAddress} (${this.dataMode.toUpperCase()} mode)...`)
      
      // Check cache first
      const cached = this.getCachedNFTs(userAddress)
      if (cached) {
        console.log(`📦 Returning cached NFTs for ${userAddress}`)
        return this.addDataModeInfo(cached)
      }
      
      let userNFTs = []
      
      if (this.mockDataEnabled) {
        // Use mock data
        userNFTs = await this.getMockNFTsForUser(userAddress)
      } else {
        // Use real blockchain data
        userNFTs = await this.getRealNFTsForUser(userAddress)
      }
      
      // Enrich with metadata
      const enrichedNFTs = await this.enrichNFTsWithMetadata(userNFTs)
      
      // Add data mode information
      const nftsWithModeInfo = this.addDataModeInfo(enrichedNFTs)
      
      // Cache results
      this.cacheNFTs(userAddress, nftsWithModeInfo)
      
      console.log(`✅ Discovered ${nftsWithModeInfo.length} NFTs for ${userAddress} (${this.dataMode.toUpperCase()} mode)`)
      return nftsWithModeInfo
      
    } catch (error) {
      console.error('❌ Failed to discover user NFTs:', error)
      throw error
    }
  }

  /**
   * Get mock NFTs for demonstration
   */
  async getMockNFTsForUser(userAddress) {
    const mockNFTs = []
    
    // Generate 3-5 mock NFTs for demonstration
    const numNFTs = Math.floor(Math.random() * 3) + 3 // 3-5 NFTs
    
    const collections = Array.from(this.supportedCollections.entries())
    
    for (let i = 0; i < numNFTs; i++) {
      const [contractAddress, collectionInfo] = collections[i % collections.length]
      const tokenId = Math.floor(Math.random() * 1000) + 1
      
      mockNFTs.push({
        contractAddress,
        tokenId: tokenId.toString(),
        owner: userAddress,
        collection: collectionInfo.name,
        symbol: collectionInfo.symbol,
        verified: collectionInfo.verified,
        type: collectionInfo.type,
        discoveredAt: new Date().toISOString(),
        isMockData: true
      })
    }
    
    return mockNFTs
  }

  /**
   * Get real NFTs from blockchain
   */
  async getRealNFTsForUser(userAddress) {
    const realNFTs = []
    
    try {
      // Check each supported collection for real NFTs
      for (const [contractAddress, collectionInfo] of this.supportedCollections) {
        try {
          const nfts = await this.getRealNFTsFromCollection(userAddress, contractAddress, collectionInfo)
          realNFTs.push(...nfts)
        } catch (error) {
          console.warn(`⚠️ Failed to fetch real NFTs from ${collectionInfo.name}:`, error.message)
        }
      }
      
      // If no real NFTs found, return empty array with helpful message
      if (realNFTs.length === 0) {
        console.log(`ℹ️ No NFTs found for ${userAddress} on supported collections`)
      }
      
      return realNFTs
      
    } catch (error) {
      console.error('❌ Failed to get real NFTs:', error)
      return []
    }
  }

  /**
   * Get real NFTs from a specific collection using blockchain calls
   */
  async getRealNFTsFromCollection(userAddress, contractAddress, collectionInfo) {
    try {
      // In production, this would use actual contract calls
      // For now, we'll simulate real blockchain interaction
      
      if (!this.client) {
        throw new Error('Blockchain client not initialized')
      }
      
      // TODO: Implement actual ERC721 contract calls
      // const balance = await this.client.readContract({
      //   address: contractAddress,
      //   abi: ERC721_ABI,
      //   functionName: 'balanceOf',
      //   args: [userAddress]
      // })
      
      // For now, return empty array to simulate no NFTs found
      // This is the professional approach - don't show fake data as real
      console.log(`🔍 Checking real NFTs in ${collectionInfo.name} for ${userAddress}`)
      
      return [] // Return empty until real contract integration is complete
      
    } catch (error) {
      console.error(`Failed to get real NFTs from ${contractAddress}:`, error)
      return []
    }
  }

  /**
   * Add data mode information to NFTs
   */
  addDataModeInfo(nfts) {
    return nfts.map(nft => ({
      ...nft,
      dataMode: this.dataMode,
      isMockData: this.mockDataEnabled,
      dataSource: this.mockDataEnabled ? 'Mock data for demonstration' : 'Real blockchain data'
    }))
  }

  /**
   * Get user NFTs with clear mode indication
   */
  async getUserNFTsWithMode(userAddress) {
    const nfts = await this.discoverUserNFTs(userAddress)
    
    return {
      nfts,
      dataMode: this.dataMode,
      isMockData: this.mockDataEnabled,
      count: nfts.length,
      message: nfts.length === 0 
        ? (this.mockDataEnabled 
          ? 'No mock NFTs generated' 
          : 'You don\'t have any NFTs to sell in the supported collections')
        : `Found ${nfts.length} NFT${nfts.length > 1 ? 's' : ''} (${this.dataMode} data)`,
      supportedCollections: this.getSupportedCollections()
    }
  }

  /**
   * Get user's NFTs from a specific collection
   */
  async getUserNFTsFromCollection(userAddress, contractAddress, collectionInfo) {
    try {
      // In production, this would use the actual contract ABI
      // For now, we'll simulate the process with mock data
      
      // Mock: Generate some NFTs for demonstration
      const mockNFTs = []
      const numNFTs = Math.floor(Math.random() * 3) + 1 // 1-3 NFTs per collection
      
      for (let i = 0; i < numNFTs; i++) {
        const tokenId = Math.floor(Math.random() * 1000) + 1
        
        mockNFTs.push({
          contractAddress,
          tokenId: tokenId.toString(),
          owner: userAddress,
          collection: collectionInfo.name,
          symbol: collectionInfo.symbol,
          verified: collectionInfo.verified,
          type: collectionInfo.type,
          discoveredAt: new Date().toISOString()
        })
      }
      
      return mockNFTs
      
    } catch (error) {
      console.error(`Failed to get NFTs from ${contractAddress}:`, error)
      return []
    }
  }

  /**
   * Enrich NFTs with metadata
   */
  async enrichNFTsWithMetadata(nfts) {
    const enrichedNFTs = []
    
    for (const nft of nfts) {
      try {
        const metadata = await this.getNFTMetadata(nft.contractAddress, nft.tokenId)
        
        enrichedNFTs.push({
          ...nft,
          ...metadata,
          id: `${nft.contractAddress}-${nft.tokenId}`,
          lastUpdated: new Date().toISOString()
        })
        
      } catch (error) {
        console.warn(`⚠️ Failed to get metadata for ${nft.contractAddress}:${nft.tokenId}`, error)
        
        // Add NFT without metadata
        enrichedNFTs.push({
          ...nft,
          id: `${nft.contractAddress}-${nft.tokenId}`,
          name: `${nft.collection} #${nft.tokenId}`,
          description: 'Metadata unavailable',
          image: '/placeholder-nft.png',
          attributes: [],
          lastUpdated: new Date().toISOString()
        })
      }
    }
    
    return enrichedNFTs
  }

  /**
   * Get NFT metadata with caching
   */
  async getNFTMetadata(contractAddress, tokenId) {
    const cacheKey = `${contractAddress}:${tokenId}`
    
    // Check cache first
    if (this.metadataCache.has(cacheKey)) {
      const cached = this.metadataCache.get(cacheKey)
      // Return cached if less than 1 hour old
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.metadata
      }
    }
    
    try {
      // In production, this would call the actual tokenURI and fetch metadata
      // For now, generate mock metadata
      const metadata = await this.generateMockMetadata(contractAddress, tokenId)
      
      // Cache metadata
      this.metadataCache.set(cacheKey, {
        metadata,
        timestamp: Date.now()
      })
      
      return metadata
      
    } catch (error) {
      console.error(`Failed to get metadata for ${contractAddress}:${tokenId}:`, error)
      throw error
    }
  }

  /**
   * Generate mock metadata for demonstration
   */
  async generateMockMetadata(contractAddress, tokenId) {
    const collectionInfo = this.supportedCollections.get(contractAddress)
    
    // Generate realistic NFT metadata
    const traits = [
      { trait_type: 'Background', value: ['Blue', 'Red', 'Green', 'Purple', 'Orange'][Math.floor(Math.random() * 5)] },
      { trait_type: 'Eyes', value: ['Normal', 'Laser', 'Sleepy', 'Wink', 'Sunglasses'][Math.floor(Math.random() * 5)] },
      { trait_type: 'Mouth', value: ['Smile', 'Frown', 'Open', 'Tongue', 'Pipe'][Math.floor(Math.random() * 5)] },
      { trait_type: 'Rarity', value: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][Math.floor(Math.random() * 5)] }
    ]
    
    return {
      name: `${collectionInfo?.name || 'Unknown'} #${tokenId}`,
      description: `${collectionInfo?.description || 'A unique NFT'} - Token ID ${tokenId}`,
      image: `/nfts/${contractAddress.slice(-8)}-${tokenId}.png`, // Mock image path
      external_url: `https://meno.marketplace/nft/${contractAddress}/${tokenId}`,
      attributes: traits,
      properties: {
        category: 'Art',
        creator: 'Morph Artist',
        created_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  }

  /**
   * Validate NFT ownership
   */
  async validateNFTOwnership(nft, userAddress) {
    try {
      // In production, this would call the ownerOf function on the contract
      // For now, simulate the check
      
      if (nft.owner?.toLowerCase() === userAddress.toLowerCase()) {
        return true
      }
      
      // Mock: Sometimes ownership might have changed
      const isStillOwner = Math.random() > 0.1 // 90% chance still owner
      
      if (!isStillOwner) {
        console.log(`⚠️ Ownership changed for ${nft.contractAddress}:${nft.tokenId}`)
        // Update cache to remove this NFT
        this.invalidateUserCache(userAddress)
      }
      
      return isStillOwner
      
    } catch (error) {
      console.error('Failed to validate NFT ownership:', error)
      return false
    }
  }

  /**
   * Refresh NFT metadata
   */
  async refreshNFTMetadata(contractAddress, tokenId) {
    const cacheKey = `${contractAddress}:${tokenId}`
    
    try {
      // Remove from cache to force refresh
      this.metadataCache.delete(cacheKey)
      
      // Fetch fresh metadata
      const metadata = await this.getNFTMetadata(contractAddress, tokenId)
      
      console.log(`🔄 Refreshed metadata for ${contractAddress}:${tokenId}`)
      return metadata
      
    } catch (error) {
      console.error('Failed to refresh NFT metadata:', error)
      throw error
    }
  }

  /**
   * Add custom collection
   */
  addCustomCollection(contractAddress, collectionInfo) {
    this.supportedCollections.set(contractAddress.toLowerCase(), {
      ...collectionInfo,
      custom: true,
      addedAt: new Date().toISOString()
    })
    
    console.log(`➕ Added custom collection: ${collectionInfo.name}`)
  }

  /**
   * Get cached NFTs for user
   */
  getCachedNFTs(userAddress) {
    const cached = this.cache.get(userAddress.toLowerCase())
    const lastRefresh = this.lastRefresh.get(userAddress.toLowerCase())
    
    if (cached && lastRefresh && (Date.now() - lastRefresh < this.refreshInterval)) {
      return cached
    }
    
    return null
  }

  /**
   * Cache NFTs for user
   */
  cacheNFTs(userAddress, nfts) {
    this.cache.set(userAddress.toLowerCase(), nfts)
    this.lastRefresh.set(userAddress.toLowerCase(), Date.now())
  }

  /**
   * Invalidate user cache
   */
  invalidateUserCache(userAddress) {
    this.cache.delete(userAddress.toLowerCase())
    this.lastRefresh.delete(userAddress.toLowerCase())
  }

  /**
   * Get supported collections
   */
  getSupportedCollections() {
    return Array.from(this.supportedCollections.entries()).map(([address, info]) => ({
      address,
      ...info
    }))
  }

  /**
   * Search NFTs by name or attributes
   */
  searchNFTs(userAddress, query) {
    const userNFTs = this.getCachedNFTs(userAddress)
    if (!userNFTs) return []
    
    const searchTerm = query.toLowerCase()
    
    return userNFTs.filter(nft => {
      // Search in name
      if (nft.name?.toLowerCase().includes(searchTerm)) return true
      
      // Search in collection
      if (nft.collection?.toLowerCase().includes(searchTerm)) return true
      
      // Search in attributes
      if (nft.attributes?.some(attr => 
        attr.trait_type?.toLowerCase().includes(searchTerm) ||
        attr.value?.toString().toLowerCase().includes(searchTerm)
      )) return true
      
      return false
    })
  }

  /**
   * Get NFT price history and market data
   */
  async getNFTMarketData(contractAddress, tokenId) {
    try {
      // Mock market data - in production, fetch from marketplace APIs
      const basePrice = Math.random() * 2 + 0.5 // 0.5-2.5 ETH
      
      return {
        currentPrice: basePrice,
        floorPrice: basePrice * 0.8,
        lastSalePrice: basePrice * 1.1,
        priceHistory: this.generatePriceHistory(basePrice),
        volume24h: Math.random() * 10,
        sales24h: Math.floor(Math.random() * 5) + 1,
        marketCap: basePrice * 1000, // Mock market cap
        holders: Math.floor(Math.random() * 500) + 100
      }
      
    } catch (error) {
      console.error('Failed to get NFT market data:', error)
      return null
    }
  }

  /**
   * Generate mock price history
   */
  generatePriceHistory(basePrice) {
    const history = []
    const days = 30
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
      const price = Math.max(0.1, basePrice + (basePrice * variation))
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(4))
      })
    }
    
    return history
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cachedUsers: this.cache.size,
      cachedMetadata: this.metadataCache.size,
      supportedCollections: this.supportedCollections.size,
      lastRefreshTimes: Array.from(this.lastRefresh.entries()).map(([user, time]) => ({
        user: `${user.slice(0, 6)}...${user.slice(-4)}`,
        lastRefresh: new Date(time).toISOString()
      }))
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear()
    this.metadataCache.clear()
    this.lastRefresh.clear()
    console.log('🧹 Cleared all NFT detection caches')
  }
}

export default NFTDetectionService