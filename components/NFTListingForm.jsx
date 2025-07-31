'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { useServices } from '../contexts/ServiceContext'
import { useWalletClient, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import MenoMarketplaceService from '../lib/services/MenoMarketplaceService'
import NetworkStatusService from '../lib/services/NetworkStatusService'
import TransactionProgress from './TransactionProgress'
import Modal from './Modal'
import PriceComparisonWidget from './PriceComparisonWidget'
import OffRampConfiguration from './OffRampConfiguration'

/**
 * Advanced NFT Listing Form Component
 * Handles multi-marketplace listing with fiat off-ramp configuration
 */
export default function NFTListingForm({ nft, isOpen, onClose, onSuccess }) {
  const { address } = useAccount()
  const { services } = useServices()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // Form state
  const [formData, setFormData] = useState({
    price: '',
    duration: '7', // days
    fiatOffRampEnabled: false,
    selectedMarketplaces: ['meno'], // Default to Meno marketplace
    currency: 'USD',
    preferredProvider: 'auto'
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Basic Info, 2: Off-ramp Config, 3: Preview
  const [errors, setErrors] = useState({})
  const [priceComparison, setPriceComparison] = useState(null)
  const [offRampProviders, setOffRampProviders] = useState([])
  const [estimatedFees, setEstimatedFees] = useState(null)

  // Contract interaction state
  const [transactionHash, setTransactionHash] = useState(null)
  const [showProgress, setShowProgress] = useState(false)
  const [transactionStage, setTransactionStage] = useState('preparing')
  const [transactionError, setTransactionError] = useState(null)

  // Load off-ramp providers on mount
  useEffect(() => {
    if (services?.providerAggregator && formData.fiatOffRampEnabled) {
      loadOffRampProviders()
    }
  }, [services, formData.fiatOffRampEnabled])

  // Load price comparison when price changes
  useEffect(() => {
    if (formData.price && parseFloat(formData.price) > 0) {
      loadPriceComparison()
    }
  }, [formData.price])

  /**
   * Load available off-ramp providers
   */
  const loadOffRampProviders = async () => {
    try {
      const providers = await services.providerAggregator.getAvailableProviders()
      setOffRampProviders(providers)

      if (formData.price) {
        const rates = await services.providerAggregator.getBestRates(
          parseEther(formData.price),
          formData.currency
        )
        setEstimatedFees(rates)
      }
    } catch (error) {
      console.error('Failed to load off-ramp providers:', error)
    }
  }

  /**
   * Load price comparison from different marketplaces
   */
  const loadPriceComparison = async () => {
    try {
      // Mock price comparison - in production, fetch from multiple marketplaces
      const comparison = {
        meno: { price: formData.price, fees: '2.5%' },
        morph: { price: formData.price, fees: '3.0%' },
        opensea: { price: (parseFloat(formData.price) * 0.98).toFixed(4), fees: '2.5%' }
      }
      setPriceComparison(comparison)
    } catch (error) {
      console.error('Failed to load price comparison:', error)
    }
  }

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  /**
   * Handle marketplace selection
   */
  const handleMarketplaceToggle = (marketplace) => {
    setFormData(prev => ({
      ...prev,
      selectedMarketplaces: prev.selectedMarketplaces.includes(marketplace)
        ? prev.selectedMarketplaces.filter(m => m !== marketplace)
        : [...prev.selectedMarketplaces, marketplace]
    }))
  }

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {}

    // Price validation
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    // Duration validation
    if (!formData.duration || parseInt(formData.duration) < 1) {
      newErrors.duration = 'Duration must be at least 1 day'
    }

    // Marketplace selection validation
    if (formData.selectedMarketplaces.length === 0) {
      newErrors.marketplaces = 'Select at least one marketplace'
    }

    // Off-ramp validation
    if (formData.fiatOffRampEnabled && !formData.preferredProvider) {
      newErrors.provider = 'Select a preferred off-ramp provider'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setShowProgress(true)
    setTransactionStage('preparing')
    setTransactionError(null)

    try {
      console.log('Starting NFT listing process...')
      console.log('NFT:', nft)
      console.log('Form data:', formData)

      // Check network status first
      const networkService = new NetworkStatusService()
      const networkStatus = await networkService.getNetworkStatus()
      
      console.log('Network status:', networkStatus)
      
      if (!networkStatus.isHealthy) {
        throw new Error(`Network issue: ${networkStatus.error}`)
      }
      
      if (networkStatus.status === 'poor') {
        console.warn('Poor network conditions detected, but proceeding...')
      }

      // Create ethers provider and signer from wagmi
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }

      // Convert wagmi clients to ethers
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Initialize marketplace service
      const marketplaceService = new MenoMarketplaceService()
      await marketplaceService.initialize(provider, signer)

      console.log('Marketplace service initialized')

      // Set stage to signing
      setTransactionStage('signing')

      // Add timeout for the entire operation
      const listingTimeout = 180000; // 3 minutes total timeout
      
      const result = await Promise.race([
        marketplaceService.listNFT(
          nft.contractAddress,
          nft.tokenId,
          formData.price,
          parseInt(formData.duration),
          formData.fiatOffRampEnabled,
          {
            onTransactionSent: (hash) => {
              console.log('Transaction sent:', hash)
              setTransactionHash(hash)
              setTransactionStage('confirming')
            }
          }
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Listing operation timed out. Please try again with higher gas price.')), listingTimeout)
        )
      ])

      console.log('✅ NFT listing result:', result)
      setTransactionHash(result.transactionHash)
      
      if (result.pending) {
        setTransactionStage('pending')
        // For pending transactions, still call success but with pending status
        onSuccess?.({
          transactionId: result.listingId,
          transactionHash: result.transactionHash,
          listingData: formData,
          nft,
          listingId: result.listingId,
          pending: true,
          message: result.message
        })
      } else {
        setTransactionStage('success')
        // Wait a moment to show success, then call success callback
        setTimeout(() => {
          onSuccess?.({
            transactionId: result.listingId,
            transactionHash: result.transactionHash,
            listingData: formData,
            nft,
            listingId: result.listingId
          })

          // Close modal and progress
          setShowProgress(false)
          onClose()
        }, 2000)
      }

    } catch (error) {
      console.error('Failed to create listing:', error)
      setTransactionError(error.message)
      setTransactionStage('error')
      setErrors({ submit: error.message })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create listing on smart contract
   */
  const createListing = async () => {
    // This would use wagmi's useContractWrite hook in practice
    // For now, return a mock transaction
    return {
      hash: '0x' + Math.random().toString(16).substring(2, 66),
      wait: () => Promise.resolve()
    }
  }

  /**
   * Sync listing with Morph marketplace
   */
  const syncWithMorphMarketplace = async (txHash) => {
    if (services?.syncManager) {
      await services.syncManager.syncListing({
        transactionHash: txHash,
        nft,
        price: parseEther(formData.price),
        duration: parseInt(formData.duration) * 24 * 60 * 60, // Convert days to seconds
        marketplaces: formData.selectedMarketplaces
      })
    }
  }

  /**
   * Setup fiat off-ramp configuration
   */
  const setupFiatOffRamp = async (txHash) => {
    if (services?.transactionProcessor) {
      await services.transactionProcessor.setupOffRamp({
        transactionHash: txHash,
        currency: formData.currency,
        preferredProvider: formData.preferredProvider,
        userAddress: address
      })
    }
  }

  /**
   * Render step 1: Basic listing information
   */
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">List Your NFT</h3>
        <p className="text-sm text-gray-600 mt-1">Set your price and listing duration</p>
      </div>

      {/* NFT Preview */}
      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <img
          src={nft?.image || '/placeholder-nft.png'}
          alt={nft?.name}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div>
          <h4 className="font-medium text-gray-900">{nft?.name}</h4>
          <p className="text-sm text-gray-600">{nft?.collection}</p>
        </div>
      </div>

      {/* Price Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price (ETH)
        </label>
        <input
          type="number"
          step="0.001"
          value={formData.price}
          onChange={(e) => handleInputChange('price', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
          placeholder="0.00"
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1">{errors.price}</p>
        )}
      </div>

      {/* Duration Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Listing Duration
        </label>
        <select
          value={formData.duration}
          onChange={(e) => handleInputChange('duration', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        >
          <option value="1">1 Day</option>
          <option value="3">3 Days</option>
          <option value="7">7 Days</option>
          <option value="14">14 Days</option>
          <option value="30">30 Days</option>
        </select>
        {errors.duration && (
          <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
        )}
      </div>

      {/* Marketplace Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          List on Marketplaces
        </label>
        <div className="space-y-2">
          {[
            { id: 'meno', name: 'Meno Marketplace', fee: '2.5%' },
            { id: 'morph', name: 'Morph Official', fee: '3.0%' },
          ].map((marketplace) => (
            <label key={marketplace.id} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.selectedMarketplaces.includes(marketplace.id)}
                onChange={() => handleMarketplaceToggle(marketplace.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-400 rounded bg-white"
              />
              <span className="text-sm text-gray-700">{marketplace.name}</span>
              <span className="text-xs text-gray-500">({marketplace.fee} fee)</span>
            </label>
          ))}
        </div>
        {errors.marketplaces && (
          <p className="text-red-500 text-sm mt-1">{errors.marketplaces}</p>
        )}
      </div>

      {/* Fiat Off-ramp Toggle */}
      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.fiatOffRampEnabled}
            onChange={(e) => handleInputChange('fiatOffRampEnabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-400 rounded bg-white"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable Fiat Off-ramp
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Automatically convert ETH to fiat when sold
        </p>
      </div>

      {/* Price Comparison Widget */}
      {formData.price && parseFloat(formData.price) > 0 && (
        <PriceComparisonWidget 
          price={formData.price} 
          currency="ETH" 
          className="mt-4"
        />
      )}
    </div>
  )

  /**
   * Render step 2: Off-ramp configuration
   */
  const renderStep2 = () => (
    <div className="space-y-6">
      <OffRampConfiguration
        enabled={formData.fiatOffRampEnabled}
        onConfigChange={(config) => {
          setFormData(prev => ({
            ...prev,
            currency: config.currency,
            preferredProvider: config.provider,
            bankDetails: config.bankDetails
          }))
        }}
        initialConfig={{
          currency: formData.currency,
          provider: formData.preferredProvider,
          autoConvert: true
        }}
      />
    </div>
  )

  /**
   * Render step 3: Preview and confirmation
   */
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Review Your Listing</h3>
        <p className="text-sm text-gray-600 mt-1">Confirm all details before listing</p>
      </div>

      {/* Listing Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-800">NFT:</span>
          <span className="text-sm font-bold text-gray-900">{nft?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-800">Price:</span>
          <span className="text-sm font-bold text-gray-900">{formData.price} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-800">Duration:</span>
          <span className="text-sm font-bold text-gray-900">{formData.duration} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-800">Marketplaces:</span>
          <span className="text-sm font-bold text-gray-900">
            {formData.selectedMarketplaces.join(', ')}
          </span>
        </div>
        {formData.fiatOffRampEnabled && (
          <>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-800">Fiat Currency:</span>
              <span className="text-sm font-bold text-gray-900">{formData.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-800">Off-ramp Provider:</span>
              <span className="text-sm font-bold text-gray-900">
                {formData.preferredProvider === 'auto' ? 'Auto-select' : formData.preferredProvider}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Price Comparison */}
      {priceComparison && (
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Price Comparison</h4>
          <div className="space-y-2">
            {Object.entries(priceComparison).map(([marketplace, data]) => (
              <div key={marketplace} className="flex justify-between items-center p-3 bg-white rounded border border-gray-300">
                <span className="text-sm font-semibold text-gray-800 capitalize">{marketplace}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{data.price} ETH</div>
                  <div className="text-xs font-medium text-gray-700">{data.fees} fee</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-red-700 text-sm">{errors.submit}</p>
        </div>
      )}
    </div>
  )

  /**
   * Render step navigation
   */
  const renderStepNavigation = () => (
    <div className="flex justify-between items-center pt-4 border-t">
      <button
        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
        className="px-4 py-2 text-sm font-semibold text-gray-800 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md"
        disabled={loading}
      >
        {step > 1 ? 'Back' : 'Cancel'}
      </button>

      <div className="flex space-x-2">
        {[1, 2, 3].map((stepNum) => (
          <div
            key={stepNum}
            className={`w-2 h-2 rounded-full ${stepNum === step ? 'bg-blue-600' :
                stepNum < step ? 'bg-green-500' : 'bg-gray-300'
              }`}
          />
        ))}
      </div>

      <button
        onClick={() => {
          if (step < 3) {
            if (step === 1 && !formData.fiatOffRampEnabled) {
              setStep(3) // Skip step 2 if fiat off-ramp is disabled
            } else {
              setStep(step + 1)
            }
          } else {
            handleSubmit()
          }
        }}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing...</span>
          </div>
        ) : (
          step === 3 ? 'List NFT' : 'Next'
        )}
      </button>
    </div>
  )

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="List NFT for Sale">
        <div className="max-w-md mx-auto">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {renderStepNavigation()}
        </div>
      </Modal>
      
      <TransactionProgress
        isVisible={showProgress}
        onClose={() => {
          setShowProgress(false)
          if (transactionStage === 'success' || transactionStage === 'error') {
            onClose()
          }
        }}
        stage={transactionStage}
        transactionHash={transactionHash}
        error={transactionError}
        explorerUrl="https://explorer-holesky.morphl2.io"
      />
    </>
  )
}