'use client';

import { useState, useEffect } from 'react';

/**
 * Step 7: Mainnet Restriction Component
 * Shows mainnet requirement popup
 */
export default function MainnetRestrictionStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [showRestriction, setShowRestriction] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState('Morph Holesky Testnet');

  useEffect(() => {
    if (isProcessing) {
      // Show restriction popup after a brief delay
      setTimeout(() => {
        setShowRestriction(true);
      }, 1000);
    }
  }, [isProcessing]);

  const handleAcknowledge = () => {
    onNext({
      restrictionMessage: "This feature is only available on mainnet, kindly switch to mainnet to off-ramp",
      networkRequired: "mainnet",
      currentNetwork,
      acknowledgedAt: new Date().toISOString()
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

      {/* Processing State */}
      {isProcessing && !showRestriction && (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="font-medium text-gray-900 mb-2">Finalizing Conversion</h4>
            <p className="text-sm text-gray-600">
              Checking network requirements for fiat off-ramp...
            </p>
          </div>
        </div>
      )}

      {/* Mainnet Restriction Popup */}
      {showRestriction && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white border-2 border-orange-200 rounded-xl shadow-lg overflow-hidden">
            {/* Popup Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">⚠️</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Network Requirement</h3>
                  <p className="text-orange-100 text-sm">Action Required</p>
                </div>
              </div>
            </div>

            {/* Popup Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  This feature is only available on mainnet, kindly switch to mainnet to off-ramp
                </h4>
                <p className="text-gray-600">
                  To complete the fiat conversion and receive funds in your bank account,
                  you need to switch to Morph Mainnet.
                </p>
              </div>

              {/* Network Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">🧪</div>
                  <h5 className="font-medium text-red-800">Current Network</h5>
                  <p className="text-sm text-red-600">{currentNetwork}</p>
                  <p className="text-xs text-red-500 mt-1">Demo Only</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">🌐</div>
                  <h5 className="font-medium text-green-800">Required Network</h5>
                  <p className="text-sm text-green-600">Morph Mainnet</p>
                  <p className="text-xs text-green-500 mt-1">Real Transactions</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-blue-800 mb-2">How to Switch Networks:</h5>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Open your wallet (MetaMask, etc.)</li>
                  <li>2. Click on the network dropdown</li>
                  <li>3. Select "Morph Mainnet"</li>
                  <li>4. Confirm the network switch</li>
                  <li>5. Return to complete your off-ramp</li>
                </ol>
              </div>

              {/* Demo Completion Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-gray-800 mb-3">Demo Completed Successfully! 🎉</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>✅ NFT listed at {stepData[0]?.formattedPrice || '0.001 ETH'}</p>
                  <p>✅ Sale processed, received {stepData[2]?.nativeTokensReceived?.toFixed(6) || '0.000975'} ETH</p>
                  <p>✅ Bridged to {stepData[3]?.stablecoinAmount?.toFixed(2) || '3.33'} {stepData[3]?.stablecoinType || 'USDT'}</p>
                  <p>✅ Bank details collected and validated</p>
                  <p>✅ Ready for ${stepData[3]?.stablecoinAmount?.toFixed(2) || '3.33'} fiat transfer</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAcknowledge}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  I Understand
                </button>
                <button
                  onClick={() => window.open('https://docs.morphl2.io/docs/quick-start/wallet-setup', '_blank')}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Switch to Mainnet
                </button>
              </div>
            </div>
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
            <h4 className="text-sm font-medium text-yellow-800">Hackathon Demo Complete</h4>
            <p className="text-sm text-yellow-700 mt-1">
              You've successfully experienced the complete NFT-to-cash workflow! This demonstrates how users can convert their NFTs to fiat currency and receive funds directly in their bank accounts on the production platform.
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
              <h4 className="text-sm font-medium text-red-800">Network Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}