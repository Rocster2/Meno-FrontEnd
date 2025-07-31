'use client';

import { useState, useEffect } from 'react';

/**
 * Step 6: Conversion Confirmation Component
 * Shows "Your NFT would be converted to cash/fiat" message
 */
export default function ConversionConfirmationStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const stablecoinData = stepData[3]; // Stablecoin data from step 4
  const bankData = stepData[4]; // Bank details from step 5

  useEffect(() => {
    if (isProcessing) {
      // Show confirmation message after a brief delay
      setTimeout(() => {
        setShowConfirmation(true);
      }, 1000);
    }
  }, [isProcessing]);

  const handleNext = () => {
    onNext({
      conversionMessage: "Your NFT would be converted to cash/fiat",
      finalAmount: stablecoinData?.stablecoinAmount || 0,
      currency: 'USD',
      bankDetails: bankData?.bankDetails,
      confirmedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="text-4xl mb-3">{step.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.name}</h3>
        <p className="text-gray-600">{step.description}</p>
      </div>

      {/* Conversion Summary */}
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-4 text-center">Conversion Summary</h4>
        
        <div className="space-y-4">
          {/* NFT Details */}
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <img
              src={nft?.image || '/placeholder-nft.png'}
              alt={nft?.name || 'NFT'}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <h5 className="font-medium text-gray-900">
                {nft?.realName || nft?.name || 'My NFT'}
              </h5>
              <p className="text-sm text-gray-600">Token #{nft?.tokenId}</p>
            </div>
          </div>

          {/* Conversion Flow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-700">Original Sale Price:</span>
              <span className="font-medium">{stepData[2]?.salePrice?.toFixed(6) || '0.001'} ETH</span>
            </div>
            
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Stablecoin Amount:</span>
              <span className="font-medium">
                {stablecoinData?.stablecoinAmount?.toFixed(2) || '0.00'} {stablecoinData?.stablecoinType || 'USDT'}
              </span>
            </div>
            
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">Bank Account:</span>
              <div className="text-right">
                <p className="font-medium text-sm">{bankData?.bankDetails?.bankName || 'Your Bank'}</p>
                <p className="text-xs text-gray-600">
                  ***{bankData?.bankDetails?.accountNumber?.slice(-4) || '****'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Confirmation Message */}
      {showConfirmation && (
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Your NFT would be converted to cash/fiat
            </h3>
            <p className="text-gray-700 mb-4">
              The complete conversion process is ready. Your NFT sale proceeds of{' '}
              <span className="font-semibold text-green-600">
                ${stablecoinData?.stablecoinAmount?.toFixed(2) || '0.00'}
              </span>{' '}
              would be transferred directly to your bank account.
            </p>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-gray-900 mb-2">Conversion Process Complete</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>✅ NFT sold successfully</p>
                <p>✅ ETH converted to {stablecoinData?.stablecoinType || 'USDT'}</p>
                <p>✅ Bank details verified</p>
                <p>✅ Ready for fiat transfer</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && !showConfirmation && (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="font-medium text-gray-900 mb-2">Processing Conversion</h4>
            <p className="text-sm text-gray-600">
              Preparing your NFT-to-cash conversion...
            </p>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="max-w-lg mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Demo Information</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This demonstrates the complete NFT-to-cash workflow. In production, this process would transfer real funds to your bank account within 1-3 business days.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-800">Conversion Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {showConfirmation && (
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Proceed to Final Step
          </button>
        </div>
      )}
    </div>
  );
}