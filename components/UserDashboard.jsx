'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useServices } from '../contexts/ServiceContext'
import NFTGrid from './NFTGrid'
import TransactionMonitor from './TransactionMonitor'
import TransactionRetryModal from './TransactionRetryModal'
import DemoNFTDisplay from './DemoNFTDisplay'
import DebugNFT from './DebugNFT'

/**
 * User Dashboard Component
 * Shows portfolio performance metrics and sales analytics
 */
export default function UserDashboard() {
  const { address, isConnected } = useAccount()
  const { services } = useServices()

  const [activeTab, setActiveTab] = useState('demo')
  const [userNFTs, setUserNFTs] = useState([])
  const [portfolioStats, setPortfolioStats] = useState(null)
  const [salesHistory, setSalesHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('7d')
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false)
  const [selectedFailedTransaction, setSelectedFailedTransaction] = useState(null)
  const [showRetryModal, setShowRetryModal] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      loadUserData()
    }
  }, [isConnected, address, timeframe])

  /**
   * Load user's NFT data and portfolio statistics
   */
  const loadUserData = async () => {
    setLoading(true)

    try {
      // Load user's NFTs
      const nfts = await loadUserNFTs()
      setUserNFTs(nfts)

      // Load portfolio statistics
      const stats = await loadPortfolioStats()
      setPortfolioStats(stats)

      // Load sales history
      const history = await loadSalesHistory()
      setSalesHistory(history)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }
  /**
   * Load user's NFT collection
   */
  const loadUserNFTs = async () => {
    // Mock data - in production, this would fetch from blockchain/API
    return [
      {
        id: 1,
        name: 'Bored Ape #1234',
        image: '/nfts/bored-ape-1234.png',
        collection: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        tokenId: '1234',
        price: 15.5,
        lastSale: 12.3,
        floorPrice: 14.2,
        listed: true,
        marketplace: 'opensea',
        rarity: 'Rare',
        attributes: [
          { trait_type: 'Background', value: 'Blue' },
          { trait_type: 'Fur', value: 'Golden Brown' }
        ]
      }
    ]
  }

  /**
   * Load portfolio statistics
   */
  const loadPortfolioStats = async () => {
    // Mock data - in production, calculate from real data
    return {
      totalValue: 72.5, // ETH
      totalInvested: 58.0, // ETH
      unrealizedGains: 14.5, // ETH
      realizedGains: 3.2, // ETH
      totalNFTs: 3,
      listedNFTs: 1,
      floorValueChange24h: 2.3, // %
      portfolioChange7d: 8.7, // %
      portfolioChange30d: -1.2, // %
      topPerformer: {
        name: 'CryptoPunk #5678',
        gain: 35.4 // %
      },
      recentActivity: []
    }
  }
  /**
   * Load sales history
   */
  const loadSalesHistory = async () => {
    // Mock data - in production, fetch from database/blockchain
    return []
  }

  /**
   * Format currency values
   */
  const formatETH = (value) => `${value.toFixed(3)} ETH`
  const formatUSD = (ethValue, rate = 2200) => `$${(ethValue * rate).toLocaleString()}`
  const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

  /**
   * Get color for percentage changes
   */
  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-500'
    if (value < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view your NFT portfolio and analytics</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-4 md:px-6 lg:px-12 py-8 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold pixel-text tracking-wider">DASHBOARD</h1>
            <p className="text-gray-400 mt-1">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="px-4 md:px-6 lg:px-12">
        <div className="flex gap-6 border-b border-gray-800">
          {[
            { id: 'demo', label: '🎯 Demo NFT', count: 1 },
            { id: 'portfolio', label: 'Portfolio', count: userNFTs.length },
            { id: 'activity', label: 'Activity', count: 0 },
            { id: 'sales', label: 'Sales History', count: salesHistory.length },
            { id: 'transactions', label: 'Transactions', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-6 lg:px-12 py-8">
        {activeTab === 'demo' && (
          <div className="space-y-6">
            <DebugNFT />
            <DemoNFTDisplay />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <NFTGrid userNFTs={userNFTs} showUserNFTs={true} />
        )}

        {activeTab === 'activity' && (
          <div className="text-center py-12 bg-gray-900 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p className="text-gray-400">Your NFT activity will appear here</p>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="text-center py-12 bg-gray-900 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No sales yet</h3>
            <p className="text-gray-400">Your NFT sales history will appear here</p>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="text-center py-12 bg-gray-900 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
            <p className="text-gray-400">Your transaction history will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}