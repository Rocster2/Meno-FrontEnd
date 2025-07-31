'use client';

import { useState, useEffect } from 'react';

/**
 * Step 2: NFT Listing Component
 */
export default function ListingStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [listingStatus, setListingStatus] = useState('preparing');
  const [transactionHash, setTransactionHash] = useState('');
  const [listingId, setListingId] = useState('');

  const priceData = stepData[0]; // Price from previous step

  useEffect(() => {
    if (isProcessing) {
      simulateListingProcess();
    }
  }, [isProcessing]);

  // Auto-start the listing process when the step loads
  useEffect(() => {
    if (listingStatus === 'preparing') {
      // Auto-start the listing process after a brief delay
      const timer = setTimeout(() => {
        simulateListingProcess();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [listingStatus]);

  const simulateListingProcess = async () => {
    setListingStatus('creating');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setListingStatus('confirming');
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    setTransactionHash(mockTxHash);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setListingStatus('completed');
    const mockListingId = `listing_${Date.now()}`;
    setListingId(mockListingId);
  };

  const handleNext = () => {
    onNext({
      listingId,
      transactionHash,
      status: 'active',
      listedAt: new Date().toISOString(),
      marketplace: 'Meno Marketplace'
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

      {/* Listing Summary */}
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-4">Listing Summary</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">NFT:</span>
            <span className="font-medium">{nft?.realName || nft?.name || 'My Morph NFT'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Token ID:</span>
            <span className="font-medium">#{nft?.tokenId || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price:</span>
            <span className="font-medium text-green-600">
              {priceData?.formattedPrice || '0.001 ETH'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Marketplace:</span>
            <span className="font-medium">Meno Platform</span>
          </div>
        </div>
      </div>

      {/* Listing Process Status */}
      <div className="max-w-md mx-auto">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Listing Process</h4>
          
          <div className="space-y-3">
            <div className={`flex items-center space-x-3 ${
              listingStatus === 'preparing' ? 'text-blue-600' : 
              ['creating', 'confirming', 'completed'].includes(listingStatus) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-4 h-4 rounded-full border-2 ${
                listingStatus === 'preparing' ? 'border-blue-600 bg-blue-100' :
                ['creating', 'confirming', 'completed'].includes(listingStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {['creating', 'confirming', 'completed'].includes(listingStatus) && (
                  <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm">Preparing listing transaction</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${
              listingStatus === 'creating' ? 'text-blue-600' : 
              ['confirming', 'completed'].includes(listingStatus) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-4 h-4 rounded-full border-2 ${
                listingStatus === 'creating' ? 'border-blue-600 bg-blue-100' :
                ['confirming', 'completed'].includes(listingStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {listingStatus === 'creating' && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                )}
                {['confirming', 'completed'].includes(listingStatus) && (
                  <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm">Creating marketplace listing</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${
              listingStatus === 'confirming' ? 'text-blue-600' : 
              listingStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-4 h-4 rounded-full border-2 ${
                listingStatus === 'confirming' ? 'border-blue-600 bg-blue-100' :
                listingStatus === 'completed' ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {listingStatus === 'confirming' && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                )}
                {listingStatus === 'completed' && (
                  <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm">Confirming on blockchain</span>
            </div>
          </div>
          
          {transactionHash && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 font-medium">Transaction Hash:</p>
              <p className="text-xs text-blue-600 font-mono break-all">
                {transactionHash}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {listingStatus === 'completed' && (
        <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-800">NFT Listed Successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                Your NFT is now live on the marketplace and available for purchase.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <h4 className="text-sm font-medium text-red-800">Listing Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {listingStatus === 'completed' && (
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Continue to Sale Process
          </button>
        </div>
      )}
    </div>
  );
}