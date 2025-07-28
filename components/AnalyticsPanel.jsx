'use client'

import { useState, useEffect } from 'react'
import { useServices } from '../contexts/ServiceContext'

/**
 * Analytics Panel Component
 * Interactive charts showing NFT price trends, sales volume, and market performance
 */
export default function AnalyticsPanel({ nft, timeframe = '7d', className = '' }) {
  const { services } = useServices()
  
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeChart, setActiveChart] = useState('price')
  const [marketComparison, setMarketComparison] = useState(null)
  
  useEffect(() => {
    loadAnalyticsData()
  }, [nft, timeframe])
  
  /**
   * Load analytics data
   */
  const loadAnalyticsData = async () => {
    setLoading(true)
    
    try {
      // Mock analytics data - in production, fetch from analytics service
      const data = await generateMockAnalytics()
      setAnalyticsData(data)
      
      // Load market comparison data
      const comparison = await generateMarketComparison()
      setMarketComparison(comparison)
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Generate mock analytics data
   */
  const generateMockAnalytics = async () => {
    const now = new Date()
    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    
    // Generate price history
    const priceHistory = []
    let basePrice = 1.5
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const variation = (Math.random() - 0.5) * 0.2 // ±10% variation
      const price = Math.max(0.1, basePrice + variation)
      
      priceHistory.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(3)),
        volume: Math.floor(Math.random() * 50) + 10,
        sales: Math.floor(Math.random() * 5) + 1
      })
      
      basePrice = price
    }
    
    // Generate volume data
    const volumeData = priceHistory.map(item => ({
      date: item.date,
      volume: item.volume,
      sales: item.sales,
      avgPrice: item.price
    }))
    
    // Generate performance metrics
    const firstPrice = priceHistory[0].price
    const lastPrice = priceHistory[priceHistory.length - 1].price
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100
    
    const totalVolume = volumeData.reduce((sum, item) => sum + item.volume, 0)
    const totalSales = volumeData.reduce((sum, item) => sum + item.sales, 0)
    
    return {
      priceHistory,
      volumeData,
      metrics: {
        currentPrice: lastPrice,
        priceChange,
        totalVolume,
        totalSales,
        avgPrice: totalVolume / totalSales,
        highPrice: Math.max(...priceHistory.map(p => p.price)),
        lowPrice: Math.min(...priceHistory.map(p => p.price)),
        volatility: calculateVolatility(priceHistory.map(p => p.price))
      }
    }
  }
  
  /**
   * Generate market comparison data
   */
  const generateMarketComparison = async () => {
    return {
      collection: {
        name: nft?.collection || 'Sample Collection',
        floorPrice: 1.2,
        floorChange: 5.3,
        volume24h: 234.5,
        volumeChange: -2.1,
        holders: 1234,
        totalSupply: 10000
      },
      similar: [
        {
          name: 'Similar Collection A',
          floorPrice: 1.8,
          change: 12.4,
          volume: 156.2
        },
        {
          name: 'Similar Collection B',
          floorPrice: 0.9,
          change: -8.7,
          volume: 89.3
        },
        {
          name: 'Similar Collection C',
          floorPrice: 2.1,
          change: 3.2,
          volume: 201.7
        }
      ],
      marketTrends: {
        overall: 'bullish',
        sentiment: 72, // 0-100
        momentum: 'increasing',
        support: 1.1,
        resistance: 2.0
      }
    }
  }
  
  /**
   * Calculate price volatility
   */
  const calculateVolatility = (prices) => {
    if (prices.length < 2) return 0
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
    return Math.sqrt(variance)
  }
  
  /**
   * Format percentage change
   */
  const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  
  /**
   * Get color for percentage changes
   */
  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-500'
    if (value < 0) return 'text-red-500'
    return 'text-gray-500'
  }
  
  /**
   * Render price chart (simplified SVG)
   */
  const renderPriceChart = () => {
    if (!analyticsData?.priceHistory) return null
    
    const data = analyticsData.priceHistory
    const maxPrice = Math.max(...data.map(d => d.price))
    const minPrice = Math.min(...data.map(d => d.price))
    const priceRange = maxPrice - minPrice || 1
    
    const width = 400
    const height = 200
    const padding = 20
    
    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding)
      const y = height - padding - ((item.price - minPrice) / priceRange) * (height - 2 * padding)
      return `${x},${y}`
    }).join(' ')
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <svg width={width} height={height} className="w-full h-auto">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Price line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={points}
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding)
            const y = height - padding - ((item.price - minPrice) / priceRange) * (height - 2 * padding)
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                className="hover:r-4 cursor-pointer"
              >
                <title>{`${item.date}: ${item.price} ETH`}</title>
              </circle>
            )
          })}
          
          {/* Y-axis labels */}
          <text x="5" y={padding} className="text-xs fill-gray-600">
            {maxPrice.toFixed(2)}
          </text>
          <text x="5" y={height - padding + 5} className="text-xs fill-gray-600">
            {minPrice.toFixed(2)}
          </text>
        </svg>
      </div>
    )
  }
  
  /**
   * Render volume chart
   */
  const renderVolumeChart = () => {
    if (!analyticsData?.volumeData) return null
    
    const data = analyticsData.volumeData
    const maxVolume = Math.max(...data.map(d => d.volume))
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end space-x-1 h-32">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 cursor-pointer relative group"
              style={{ height: `${(item.volume / maxVolume) * 100}%` }}
            >
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {item.volume} ETH
                <br />
                {item.sales} sales
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
          
          {/* Chart type selector */}
          <div className="flex gap-2">
            {[
              { id: 'price', label: 'Price' },
              { id: 'volume', label: 'Volume' },
              { id: 'comparison', label: 'Market' }
            ].map((chart) => (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  activeChart === chart.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {chart.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Metrics */}
      {analyticsData?.metrics && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.metrics.currentPrice.toFixed(3)} ETH
              </div>
              <div className="text-sm text-gray-600">Current Price</div>
              <div className={`text-sm ${getChangeColor(analyticsData.metrics.priceChange)}`}>
                {formatPercent(analyticsData.metrics.priceChange)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.metrics.totalVolume.toFixed(1)} ETH
              </div>
              <div className="text-sm text-gray-600">Total Volume</div>
              <div className="text-sm text-gray-500">
                {analyticsData.metrics.totalSales} sales
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.metrics.highPrice.toFixed(3)} ETH
              </div>
              <div className="text-sm text-gray-600">High</div>
              <div className="text-sm text-gray-500">
                Low: {analyticsData.metrics.lowPrice.toFixed(3)} ETH
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(analyticsData.metrics.volatility * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Volatility</div>
              <div className="text-sm text-gray-500">
                Avg: {analyticsData.metrics.avgPrice.toFixed(3)} ETH
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Content */}
      <div className="p-6">
        {activeChart === 'price' && renderPriceChart()}
        {activeChart === 'volume' && renderVolumeChart()}
        
        {activeChart === 'comparison' && marketComparison && (
          <div className="space-y-6">
            {/* Collection Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Collection Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Floor Price</div>
                  <div className="font-medium">{marketComparison.collection.floorPrice} ETH</div>
                  <div className={getChangeColor(marketComparison.collection.floorChange)}>
                    {formatPercent(marketComparison.collection.floorChange)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">24h Volume</div>
                  <div className="font-medium">{marketComparison.collection.volume24h} ETH</div>
                  <div className={getChangeColor(marketComparison.collection.volumeChange)}>
                    {formatPercent(marketComparison.collection.volumeChange)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Holders</div>
                  <div className="font-medium">{marketComparison.collection.holders.toLocaleString()}</div>
                  <div className="text-gray-500">
                    {((marketComparison.collection.holders / marketComparison.collection.totalSupply) * 100).toFixed(1)}% unique
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Total Supply</div>
                  <div className="font-medium">{marketComparison.collection.totalSupply.toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            {/* Similar Collections */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Similar Collections</h4>
              <div className="space-y-2">
                {marketComparison.similar.map((collection, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{collection.name}</div>
                    <div className="text-right">
                      <div className="font-medium">{collection.floorPrice} ETH</div>
                      <div className={`text-sm ${getChangeColor(collection.change)}`}>
                        {formatPercent(collection.change)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Market Sentiment */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Market Sentiment</h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Overall Trend</div>
                  <div className="font-medium capitalize text-green-600">
                    {marketComparison.marketTrends.overall}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Sentiment Score</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {marketComparison.marketTrends.sentiment}/100
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Support/Resistance</div>
                  <div className="font-medium">
                    {marketComparison.marketTrends.support} - {marketComparison.marketTrends.resistance} ETH
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Export Options */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Export analytics data for further analysis
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Export CSV
            </button>
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Export JSON
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}