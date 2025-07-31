'use client';

import { useState, useEffect } from 'react';

/**
 * Step 3: Sale Processing Component
 * Buyer purchases NFT and seller receives ETH directly
 */
export default function SaleProcessingStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [saleStatus, setSaleStatus] = useState('waiting');
  const [buyer, setBuyer] = useState('');
  const [salePrice, setSalePrice] = useState(0);
  const [nativeTokensReceived, setNativeTokensReceived] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');

  const priceData = stepData[0]; // Price from step 1
  const listingData = stepData[1]; // Listing from step 2

  useEffect(() => {
    if (isProcessing) {
      simulateSaleProcess();
    }
  }, [isProcessing]);

  // Auto-start the sale confirmation process when the step loads
  useEffect(() => {
    if (saleStatus === 'waiting') {
      // Auto-start the sale confirmation process after a brief delay
      const timer = setTimeout(() => {
        simulateSaleProcess();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [saleStatus]);

  const simulateSaleProcess = async () => {
    setSaleStatus('confirming_sale');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSaleStatus('updating_balance');
    const mockBuyer = `0x${Math.random().toString(16).substr(2, 40)}`;
    setBuyer(mockBuyer);
    const price = priceData?.price || 0.001;
    setSalePrice(price);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSaleStatus('finalizing');
    // Seller receives ETH directly (native tokens)
    const platformFee = price * 0.025; // 2.5% platform fee
    const netAmount = price - platformFee;
    setNativeTokensReceived(netAmount);
    
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    setTransactionHash(mockTxHash);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSaleStatus('completed');
    
    // Auto-proceed to next step after showing success for 3 seconds
    setTimeout(() => {
      console.log('SaleProcessingStep: Auto-proceeding to next step');
      handleNext();
    }, 3000);
  };

  const handleNext = () => {
    console.log('SaleProcessingStep: handleNext called', { buyer, salePrice, nativeTokensReceived });
    if (onNext) {
      onNext({
        buyer,
        salePrice,
        nativeTokensReceived,
        transactionHash,
        platformFee: salePrice * 0.025,
        netAmount: nativeTokensReceived,
        completedAt: new Date().toISOString()
      });
    } else {
      console.error('SaleProcessingStep: onNext prop is not available');
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

      {/* Sale Confirmation Process */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="font-medium text-gray-900 mb-4 text-center">Sale Confirmation</h4>
          
          <div className="space-y-4">
            <div className={`flex items-center space-x-3 ${
              saleStatus === 'waiting' || saleStatus === 'confirming_sale' ? 'text-blue-600' : 
              ['updating_balance', 'finalizing', 'completed'].includes(saleStatus) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-5 h-5 rounded-full border-2 ${
                saleStatus === 'confirming_sale' ? 'border-blue-600 bg-blue-100' :
                ['updating_balance', 'finalizing', 'completed'].includes(saleStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {saleStatus === 'confirming_sale' && (
                  <div className="w-3 h-3 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                )}
                {['updating_balance', 'finalizing', 'completed'].includes(saleStatus) && (
                  <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Confirming NFT sale transaction</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${
              saleStatus === 'updating_balance' ? 'text-blue-600' : 
              ['finalizing', 'completed'].includes(saleStatus) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-5 h-5 rounded-full border-2 ${
                saleStatus === 'updating_balance' ? 'border-blue-600 bg-blue-100' :
                ['finalizing', 'completed'].includes(saleStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {saleStatus === 'updating_balance' && (
                  <div className="w-3 h-3 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                )}
                {['finalizing', 'completed'].includes(saleStatus) && (
                  <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Adding native tokens to your balance</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${
              saleStatus === 'finalizing' ? 'text-blue-600' : 
              saleStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-5 h-5 rounded-full border-2 ${
                saleStatus === 'finalizing' ? 'border-blue-600 bg-blue-100' :
                saleStatus === 'completed' ? 'border-green-600 bg-green-600' : 'border-gray-300'
              }`}>
                {saleStatus === 'finalizing' && (
                  <div className="w-3 h-3 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                )}
                {saleStatus === 'completed' && (
                  <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Finalizing transaction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Details */}
      {buyer && (
        <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Sale Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Buyer:</span>
              <span className="font-mono text-xs">{buyer.slice(0, 6)}...{buyer.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sale Price:</span>
              <span className="font-medium">{salePrice} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee (2.5%):</span>
              <span className="text-red-600">-{(salePrice * 0.025).toFixed(6)} ETH</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span className="text-gray-900">You Receive:</span>
              <span className="text-green-600">{nativeTokensReceived.toFixed(6)} ETH</span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Hash */}
      {transactionHash && (
        <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-800 font-medium mb-1">Sale Transaction:</p>
          <p className="text-xs text-blue-600 font-mono break-all">
            {transactionHash}
          </p>
        </div>
      )}

      {/* Success Message */}
      {saleStatus === 'completed' && (
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Sale Confirmed Successfully!
            </h3>
            <p className="text-gray-700 mb-4">
              Your NFT has been sold and <span className="font-semibold text-green-600">{nativeTokensReceived.toFixed(6)} ETH</span> has been added to your balance.
            </p>
            
            <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Transaction Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>✅ NFT successfully transferred to buyer</p>
                <p>✅ Payment confirmed and processed</p>
                <p>✅ Native tokens added to your wallet</p>
                <p>✅ Ready for stablecoin conversion</p>
              </div>
            </div>
            
            <div className="text-sm text-blue-600 font-medium mb-4">
              Proceeding to stablecoin bridge...
            </div>
            
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Continue to Stablecoin Bridge
            </button>
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
              <h4 className="text-sm font-medium text-red-800">Sale Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}