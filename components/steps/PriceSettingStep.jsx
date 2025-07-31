'use client';

import { useState } from 'react';

/**
 * Step 1: Price Setting Component
 */
export default function PriceSettingStep({ step, nft, isProcessing, error, onNext }) {
  const [price, setPrice] = useState('0.001');
  const [currency] = useState('ETH');
  const [validationError, setValidationError] = useState('');

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setPrice(value);
    setValidationError('');
  };

  const validatePrice = () => {
    const numPrice = parseFloat(price);
    
    if (!price || isNaN(numPrice)) {
      setValidationError('Please enter a valid price');
      return false;
    }
    
    if (numPrice <= 0) {
      setValidationError('Price must be greater than 0');
      return false;
    }
    
    if (numPrice > 1000) {
      setValidationError('Price seems too high for demo purposes');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validatePrice()) {
      onNext({
        price: parseFloat(price),
        currency,
        formattedPrice: `${price} ${currency}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="text-4xl mb-3">{step.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.name}</h3>
        <p className="text-gray-600">{step.description}</p>
      </div>

      {/* Price Input Form */}
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Listing Price
          </label>
          
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0"
              max="1000"
              value={price}
              onChange={handlePriceChange}
              disabled={isProcessing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium disabled:opacity-50 text-gray-900 bg-white"
              placeholder="0.001"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 font-medium">{currency}</span>
            </div>
          </div>
          
          {(validationError || error) && (
            <p className="mt-2 text-sm text-red-600">
              {validationError || error}
            </p>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <p>• Minimum: 0.001 ETH</p>
            <p>• This is a demo price for hackathon demonstration</p>
          </div>
        </div>
      </div>

      {/* Market Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Pricing Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              Your NFT will be listed at this price on the marketplace. Once sold, you'll receive the proceeds in ETH, which will then be converted to stablecoin and finally to fiat currency in your bank account.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleNext}
          disabled={isProcessing || !price}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Setting Price...</span>
            </div>
          ) : (
            'Set Price & Continue'
          )}
        </button>
      </div>
    </div>
  );
}