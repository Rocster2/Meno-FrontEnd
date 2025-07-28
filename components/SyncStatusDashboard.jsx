'use client'

import { useState, useEffect } from 'react'
import { useServices } from '../contexts/ServiceContext'

/**
 * Marketplace Synchronization Status Dashboard
 * Displays real-time synchronization status across platforms
 */
export default function SyncStatusDashboard({ listingId, className = '' }) {
  const { services } = useServices()
  
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  
  useEffect(() => {
    if (listingId) {
      loadSyncStatus()
    }
  }, [listingId])
  
  useEffect(() => {
    let interval
    if (autoRefresh && listingId) {
      interval = setInterval(() => {
        loadSyncStatus()
      }, 5000) // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, listingId])
  
  /**
   * Load synchronization status
   */
  const loadSyncStatus = async () => {
    if (!services?.syncManager) return
    
    setLoading(true)
    try {
      // Get current sync status
      const status = await getSyncStatus(listingId)
      setSyncStatus(status)
      
      // Get sync history
      const history = await getSyncHistory(listingId)
      setSyncHistory(history)
      
      setLastUpdated(new Date())
      
    } catch (error) {
      console.error('Failed to load sync status:', error)
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Get synchronization status (mock implementation)
   */
  const getSyncStatus = async (listingId) => {
    // Mock data - in production, this would call the actual sync manager
    return {
      listingId,
      overallStatus: 'synced', // 'syncing', 'synced', 'error', 'partial'
      platforms: {
        meno: {
          name: 'Meno Marketplace',
          status: 'synced',
          listingId: `meno_${listingId}`,
          lastSync: new Date(Date.now() - 30000), // 30 seconds ago
          url: `https://meno.marketplace/listing/${listingId}`,
          price: '1.5 ETH',
          views: 234,
          likes: 12
        },
        morph: {
          name: 'Morph Official',
          status: 'synced',
          listingId: `morph_${listingId}`,
          lastSync: new Date(Date.now() - 45000), // 45 seconds ago
          url: `https://morph.marketplace/nft/${listingId}`,
          price: '1.5 ETH',
          views: 156,
          likes: 8
        },
        opensea: {
          name: 'OpenSea',
          status: 'not_available',
          listingId: null,
          lastSync: null,
          url: null,
          reason: 'Platform not integrated'
        }
      },
      metrics: {
        totalViews: 390,
        totalLikes: 20,
        syncLatency: 2.3, // seconds
        lastFullSync: new Date(Date.now() - 60000),
        syncSuccess: 98.5 // percentage
      }
    }
  }
  
  /**
   * Get synchronization history (mock implementation)
   */
  const getSyncHistory = async (listingId) => {
    // Mock data - in production, this would fetch from database
    return [
      {
        id: 1,
        timestamp: new Date(Date.now() - 30000),
        action: 'price_update',
        platform: 'morph',
        status: 'success',
        details: 'Price updated from 1.2 ETH to 1.5 ETH',
        duration: 1.2
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 120000),
        action: 'listing_sync',
        platform: 'meno',
        status: 'success',
        details: 'Listing synchronized successfully',
        duration: 0.8
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 180000),
        action: 'metadata_update',
        platform: 'morph',
        status: 'success',
        details: 'NFT metadata refreshed',
        duration: 2.1
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 300000),
        action: 'initial_sync',
        platform: 'all',
        status: 'success',
        details: 'Initial listing created on all platforms',
        duration: 5.4
      }
    ]
  }
  
  /**
   * Trigger manual sync
   */
  const handleManualSync = async () => {
    if (!services?.syncManager) return
    
    setLoading(true)
    try {
      await services.syncManager.forceSyncListing(listingId)
      await loadSyncStatus()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'synced':
        return 'text-green-500'
      case 'syncing':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      case 'partial':
        return 'text-orange-500'
      case 'not_available':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }
  
  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced':
        return '✅'
      case 'syncing':
        return '🔄'
      case 'error':
        return '❌'
      case 'partial':
        return '⚠️'
      case 'not_available':
        return '⚫'
      default:
        return '❓'
    }
  }
  
  /**
   * Get status text
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'synced':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Error'
      case 'partial':
        return 'Partial Sync'
      case 'not_available':
        return 'Not Available'
      default:
        return 'Unknown'
    }
  }
  
  /**
   * Format time ago
   */
  const formatTimeAgo = (date) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diff = now - date
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }
  
  if (!listingId) {
    return (
      <div className={`bg-white rounded-lg border p-6 text-center ${className}`}>
        <div className="text-gray-400 text-4xl mb-4">🔄</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Listing Selected</h3>
        <p className="text-gray-600">Select a listing to view synchronization status</p>
      </div>
    )
  }
  
  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
            <p className="text-sm text-gray-600">
              Listing ID: {listingId}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Auto-refresh toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </label>
            
            {/* Manual sync button */}
            <button
              onClick={handleManualSync}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-2 text-xs text-gray-500">
            Last updated: {formatTimeAgo(lastUpdated)}
          </div>
        )}
      </div>
      
      {/* Overall Status */}
      {syncStatus && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getStatusIcon(syncStatus.overallStatus)}</span>
              <div>
                <h4 className="font-medium text-gray-900">Overall Status</h4>
                <p className={`text-sm font-medium ${getStatusColor(syncStatus.overallStatus)}`}>
                  {getStatusText(syncStatus.overallStatus)}
                </p>
              </div>
            </div>
            
            {/* Metrics */}
            <div className="text-right">
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-lg font-semibold text-green-600">
                {syncStatus.metrics.syncSuccess}%
              </div>
            </div>
          </div>
          
          {/* Quick metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900">
                {syncStatus.metrics.totalViews}
              </div>
              <div className="text-xs text-gray-600">Total Views</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900">
                {syncStatus.metrics.totalLikes}
              </div>
              <div className="text-xs text-gray-600">Total Likes</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900">
                {syncStatus.metrics.syncLatency}s
              </div>
              <div className="text-xs text-gray-600">Avg Latency</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Platform Status */}
      {syncStatus?.platforms && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Platform Status</h4>
          
          <div className="space-y-4">
            {Object.entries(syncStatus.platforms).map(([platformId, platform]) => (
              <div key={platformId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(platform.status)}</span>
                  <div>
                    <h5 className="font-medium text-gray-900">{platform.name}</h5>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className={getStatusColor(platform.status)}>
                        {getStatusText(platform.status)}
                      </span>
                      {platform.lastSync && (
                        <>
                          <span>•</span>
                          <span>{formatTimeAgo(platform.lastSync)}</span>
                        </>
                      )}
                    </div>
                    {platform.reason && (
                      <div className="text-xs text-gray-500 mt-1">{platform.reason}</div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {platform.status === 'synced' && (
                    <>
                      <div className="text-sm font-medium text-gray-900">{platform.price}</div>
                      <div className="text-xs text-gray-600">
                        {platform.views} views • {platform.likes} likes
                      </div>
                      {platform.url && (
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Listing →
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Sync History */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Sync History</h4>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            View All
          </button>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {syncHistory.map((event) => (
            <div key={event.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                event.status === 'success' ? 'bg-green-500' : 
                event.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {event.action.replace('_', ' ')}
                  </p>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{event.details}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 capitalize">{event.platform}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{event.duration}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Troubleshooting */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        <h5 className="font-medium text-gray-900 mb-2">Common Issues & Solutions</h5>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-500 mt-0.5">⚠️</span>
            <div>
              <strong>Sync delays:</strong> Network congestion may cause delays. Try manual sync.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500 mt-0.5">❌</span>
            <div>
              <strong>Sync failures:</strong> Check your wallet connection and try again.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">ℹ️</span>
            <div>
              <strong>Price mismatches:</strong> Prices sync within 10 seconds across platforms.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}