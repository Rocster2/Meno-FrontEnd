'use client'

import { useState, useEffect } from 'react'
import { useServices } from '../contexts/ServiceContext'

/**
 * OffRampConfiguration - Configure fiat off-ramp settings
 * Handles provider selection, currency preferences, and KYC requirements
 */
export default function OffRampConfiguration({ 
  enabled = false, 
  onConfigChange, 
  initialConfig = {},
  className = '' 
}) {
  const { services } = useServices()
  
  const [config, setConfig] = useState({
    currency: 'NGN',
    provider: 'paycrest',
    autoConvert: true,
    kycCompleted: false,
    bankDetails: {
      accountNumber: '',
      bankCode: '',
      accountName: ''
    },
    ...initialConfig
  })

  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState(null)

  // Nigerian banks for Paycrest integration
  const nigerianBanks = [
    { code: '044', name: 'Access Bank' },
    { code: '063', name: 'Access Bank (Diamond)' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '526', name: 'Parallex Bank' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '100', name: 'Suntrust Bank' },
    { code: '102', name: 'Titan Trust Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '033', name: 'United Bank for Africa' },
    { code: '215', name: 'Unity Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' }
  ]

  useEffect(() => {
    if (enabled) {
      loadProviders()
    }
  }, [enabled, services])

  useEffect(() => {
    onConfigChange?.(config)
  }, [config, onConfigChange])

  const loadProviders = async () => {
    setLoading(true)
    try {
      // For now, we focus on Paycrest as the primary provider
      const availableProviders = [
        {
          id: 'paycrest',
          name: 'Paycrest',
          currencies: ['NGN'],
          countries: ['NG'],
          fee: 1.5,
          processingTime: '5-15 minutes',
          minAmount: 10,
          maxAmount: 50000,
          status: 'active',
          features: ['instant', 'bank_transfer', 'mobile_money']
        }
      ]
      
      setProviders(availableProviders)
      
      // Load current rates if Paycrest service is available
      if (services?.paycrestService) {
        const currentRates = await services.paycrestService.getConversionRate(1, 'USDT')
        setRates(currentRates)
      }
    } catch (error) {
      console.error('Failed to load off-ramp providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBankDetailsChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }))
  }

  const validateBankAccount = async () => {
    if (!config.bankDetails.accountNumber || !config.bankDetails.bankCode) {
      return
    }

    try {
      setLoading(true)
      // In production, this would validate the account with the bank
      // For now, we'll simulate validation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock account name resolution
      const mockAccountName = "John Doe" // This would come from bank API
      handleBankDetailsChange('accountName', mockAccountName)
    } catch (error) {
      console.error('Failed to validate bank account:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">Fiat Off-ramp Configuration</h4>
        <p className="text-sm text-gray-600 mb-6">
          Configure how you want to receive fiat currency when your NFT sells
        </p>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Off-ramp Provider
        </label>
        {loading ? (
          <div className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
        ) : (
          <div className="space-y-3">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  config.provider === provider.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleConfigChange('provider', provider.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.id}
                      checked={config.provider === provider.id}
                      onChange={() => handleConfigChange('provider', provider.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h5 className="font-medium text-gray-900">{provider.name}</h5>
                      <p className="text-sm text-gray-600">
                        {provider.fee}% fee • {provider.processingTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {provider.currencies.join(', ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${provider.minAmount} - ${provider.maxAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {provider.features && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {provider.features.map(feature => (
                      <span
                        key={feature}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        {feature.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred Currency
        </label>
        <select
          value={config.currency}
          onChange={(e) => handleConfigChange('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="NGN">NGN - Nigerian Naira</option>
        </select>
        
        {rates && (
          <div className="mt-2 text-sm text-gray-600">
            Current rate: 1 USDT = ₦{rates.exchangeRate?.toLocaleString() || 'N/A'}
          </div>
        )}
      </div>

      {/* Bank Details for Nigerian accounts */}
      {config.currency === 'NGN' && (
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Bank Account Details</h5>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank
            </label>
            <select
              value={config.bankDetails.bankCode}
              onChange={(e) => handleBankDetailsChange('bankCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your bank</option>
              {nigerianBanks.map(bank => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={config.bankDetails.accountNumber}
                onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)}
                placeholder="Enter 10-digit account number"
                maxLength={10}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={validateBankAccount}
                disabled={!config.bankDetails.accountNumber || !config.bankDetails.bankCode || loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>

          {config.bankDetails.accountName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                ✓ {config.bankDetails.accountName}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-convert Toggle */}
      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.autoConvert}
            onChange={(e) => handleConfigChange('autoConvert', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Auto-convert on sale
            </span>
            <p className="text-xs text-gray-500">
              Automatically convert to fiat when NFT sells (recommended)
            </p>
          </div>
        </label>
      </div>

      {/* KYC Status */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h6 className="text-sm font-medium text-yellow-800">KYC Verification Required</h6>
            <p className="text-sm text-yellow-700 mt-1">
              You'll need to complete identity verification before your first fiat conversion.
              This is a one-time process that takes 5-10 minutes.
            </p>
            <button className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900">
              Start KYC Process
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h6 className="text-sm font-medium text-gray-900 mb-2">Configuration Summary</h6>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Provider: {providers.find(p => p.id === config.provider)?.name || 'Not selected'}</div>
          <div>Currency: {config.currency}</div>
          <div>Auto-convert: {config.autoConvert ? 'Enabled' : 'Disabled'}</div>
          {config.bankDetails.accountName && (
            <div>Bank Account: {config.bankDetails.accountName} ({config.bankDetails.accountNumber})</div>
          )}
        </div>
      </div>
    </div>
  )
}