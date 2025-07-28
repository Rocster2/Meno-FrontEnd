'use client'

import { useState, useEffect } from 'react'

/**
 * PriceComparisonWidget - Shows price comparison across different marketplaces
 * Displays real-time rates and fees for informed decision making
 */
export default function PriceComparisonWidget({ price, currency = 'ETH', className = '' }) {
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (price && parseFloat(price) > 0) {
      fetchPriceComparison()
    }
  }, [price, currency])

  const fetchPriceComparison = async () => {
    setLoading(true)
    try {
      // Simulate API call to get marketplace comparison
      // In production, this would fetch real data from multiple marketplaces
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const basePrice = parseFloat(price)
      const comparison = {
        meno: {
          name: 'Meno Marketplace',
          price: basePrice,
          fee: 2.5,
          netAmount: basePrice * 0.975,
          processingTime: '5-10 min',
          status: 'available'
        },
        morph: {
          name: 'Morph Official',
          price: basePrice * 1.02, // Slightly higher due to demand
          fee: 3.0,
          netAmount: basePrice * 1.02 * 0.97,
          processingTime: '10-15 min',
          status: 'available'
        },
        opensea: {
          name: 'OpenSea',
          price: basePrice * 0.98, // Slightly lower
          fee: 2.5,
          netAmount: basePrice * 0.98 * 0.975,
          processingTime: '15-30 min',
          status: 'limited' // Limited cross-chain support
        }
      }
      
      setComparison(comparison)
    } catch (error) {
      console.error('Failed to fetch price comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!price || parseFloat(price) <= 0) {
    return null
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Price Comparison</h4>
        <button
          onClick={fetchPriceComparison}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : comparison ? (
        <div className="space-y-2">
          {Object.entries(comparison).map(([key, marketplace]) => (
            <div
              key={key}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                marketplace.status === 'available' 
                  ? 'bg-white border-gray-200' 
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {marketplace.name}
                  </span>
                  {marketplace.status === 'limited' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Limited
                    </span>
                  )}
                  {key === 'meno' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {marketplace.fee}% fee • {marketplace.processingTime}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {marketplace.price.toFixed(4)} {currency}
                </div>
                <div className="text-xs text-gray-500">
                  Net: {marketplace.netAmount.toFixed(4)} {currency}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          Failed to load comparison data
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        * Prices are estimates and may vary based on market conditions
      </div>
    </div>
  )
}