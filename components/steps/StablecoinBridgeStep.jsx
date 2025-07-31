'use client';

import { useState, useEffect } from 'react';

/**
 * Step 4: Stablecoin Bridge Component
 * Convert ETH to USDT/USDC
 */
export default function StablecoinBridgeStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [selectedStablecoin, setSelectedStablecoin] = useState('USDT');
  const [bridgeStatus, setBridgeStatus] = useState('selecting');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [stablecoinAmount, setStablecoinAmount] = useState(0);
  const [bridgeFee, setBridgeFee] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');

  const saleData = stepData[2]; // Sale data from step 3
  const ethAmount = saleData?.nativeTokensReceived || 0;

  useEffect(() => {
    // Simulate getting exchange rates
    const mockRate = selectedStablecoin === 'USDT' ? 3420.50 : 3418.75; // Mock ETH to USD rates
    setExchangeRate(mockRate);
    
    const fee = ethAmount * 0.003; // 0.3% bridge fee
    setBridgeFee(fee);
    
    const netEth = ethAmount - fee;
    setStablecoinAmount(netEth * mockRate);
  }, [selectedStablecoin, ethAmount]);

  useEffect(() => {
    if (isProcessing && bridgeStatus === 'selecting') {
      simulateBridgeProcess();
    }
  }, [isProcessing, bridgeStatus]);

  const simulateBridgeProcess = async () => {
    setBridgeStatus('initiating');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setBridgeStatus('bridging');
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    setTransactionHash(mockTxHash);
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setBridgeStatus('confirming');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setBridgeStatus('completed');
  };

  const handleStablecoinSelect = (coin) => {
    if (!isProcessing) {
      setSelectedStablecoin(coin);
    }
  };

  const handleNext = () => {
    onNext({
      stablecoinType: selectedStablecoin,
      ethAmount,
      stablecoinAmount,
      exchangeRate,
      bridgeFee,
      transactionHash,
      completedAt: new Date().toISOString()
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
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="font-medium text-gray-900 mb-4">Conversion Details</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">ETH Amount:</span>
            <span className="font-medium">{ethAmount.toFixed(6)} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Exchange Rate:</span>
            <span className="font-medium">${exchangeRate.toLocaleString()}/ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Bridge Fee (0.3%):</span>
            <span className="text-red-600">-{bridgeFee.toFixed(6)} ETH</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-medium">
            <span className="text-gray-900">You'll Receive:</span>
            <span className="text-green-600">{stablecoinAmount.toFixed(2)} {selectedStablecoin}</span>
          </div>
        </div>
      </div>

      {/* Network Disclaimer */}
      {bridgeStatus === 'selecting' && (
        <div className="max-w-lg mx-auto mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Why Bridge to Stablecoin?</h4>
              <p className="text-sm text-blue-700 mt-1">
                Your native ETH tokens are being converted to stablecoin (USDC/USDT) because our fiat off-ramp service partners don't directly support Morph network yet. By bridging to widely-supported stablecoins on established networks, we can ensure reliable conversion to your local currency and bank transfer.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                This process ensures you get the best exchange rates and fastest settlement times for your fiat conversion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stablecoin Selection */}
      {bridgeStatus === 'selecting' && (
        <div className="max-w-md mx-auto">
          <h4 className="font-medium text-gray-900 mb-4 text-center">Choose Stablecoin</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStablecoinSelect('USDT')}
              disabled={isProcessing}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedStablecoin === 'USDT'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-lg">₮</span>
                </div>
                <h5 className="font-medium text-gray-900">USDT</h5>
                <p className="text-xs text-gray-600">Tether USD</p>
                <p className="text-xs text-green-600 mt-1">Most Popular</p>
              </div>
            </button>
            
            <button
              onClick={() => handleStablecoinSelect('USDC')}
              disabled={isProcessing}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedStablecoin === 'USDC'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">$</span>
                </div>
                <h5 className="font-medium text-gray-900">USDC</h5>
                <p className="text-xs text-gray-600">USD Coin</p>
                <p className="text-xs text-blue-600 mt-1">Lower Fees</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bridge Process Status */}
      {bridgeStatus !== 'selecting' && (
        <div className="max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Bridge Process</h4>
            
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 ${
                bridgeStatus === 'initiating' ? 'text-blue-600' : 
                ['bridging', 'confirming', 'completed'].includes(bridgeStatus) ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  bridgeStatus === 'initiating' ? 'border-blue-600 bg-blue-100' :
                  ['bridging', 'confirming', 'completed'].includes(bridgeStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`}>
                  {bridgeStatus === 'initiating' && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                  )}
                  {['bridging', 'confirming', 'completed'].includes(bridgeStatus) && (
                    <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Initiating bridge transaction</span>
              </div>
              
              <div className={`flex items-center space-x-3 ${
                bridgeStatus === 'bridging' ? 'text-blue-600' : 
                ['confirming', 'completed'].includes(bridgeStatus) ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  bridgeStatus === 'bridging' ? 'border-blue-600 bg-blue-100' :
                  ['confirming', 'completed'].includes(bridgeStatus) ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`}>
                  {bridgeStatus === 'bridging' && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                  )}
                  {['confirming', 'completed'].includes(bridgeStatus) && (
                    <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Converting ETH to {selectedStablecoin}</span>
              </div>
              
              <div className={`flex items-center space-x-3 ${
                bridgeStatus === 'confirming' ? 'text-blue-600' : 
                bridgeStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  bridgeStatus === 'confirming' ? 'border-blue-600 bg-blue-100' :
                  bridgeStatus === 'completed' ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`}>
                  {bridgeStatus === 'confirming' && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-0.5 mt-0.5 animate-pulse" />
                  )}
                  {bridgeStatus === 'completed' && (
                    <svg className="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Confirming bridge completion</span>
              </div>
            </div>
            
            {transactionHash && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">Bridge Transaction:</p>
                <p className="text-xs text-blue-600 font-mono break-all">
                  {transactionHash}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {bridgeStatus === 'completed' && (
        <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-800">Bridge Completed!</h4>
              <p className="text-sm text-green-700 mt-1">
                Successfully converted to {stablecoinAmount.toFixed(2)} {selectedStablecoin}. 
                Ready for fiat conversion to your bank account.
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
              <h4 className="text-sm font-medium text-red-800">Bridge Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {bridgeStatus === 'selecting' && (
          <button
            onClick={() => simulateBridgeProcess()}
            disabled={isProcessing}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Bridging...</span>
              </div>
            ) : (
              `Bridge to ${selectedStablecoin}`
            )}
          </button>
        )}
        
        {bridgeStatus === 'completed' && (
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Continue to Bank Details
          </button>
        )}
      </div>
    </div>
  );
}