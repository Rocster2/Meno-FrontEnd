'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import NFTOffRampService from '../lib/services/NFTOffRampService';

/**
 * Demo Off-ramp Flow Component
 * Perfect for hackathon demonstration
 */
export default function DemoOffRampFlow({ nft, isOpen, onClose }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const steps = [
    { name: 'List NFT on Marketplace', icon: '📝', color: 'blue' },
    { name: 'Find Buyer & Process Sale', icon: '🤝', color: 'green' },
    { name: 'Convert ETH to USD', icon: '💱', color: 'purple' },
    { name: 'Convert to Native Tokens', icon: '🏦', color: 'orange' },
    { name: 'Transfer Complete', icon: '✅', color: 'green' }
  ];

  const handleStartDemo = async () => {
    if (!walletClient || !publicClient) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);

    try {
      // Initialize services
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const offRampService = new NFTOffRampService();
      await offRampService.initialize(provider, signer);

      // Run quick demo
      const demoPrice = 0.001; // 0.001 ETH for demo
      
      // Simulate step progression
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      }

      // Get final results
      const demoResults = await offRampService.quickDemoOffRamp(
        nft.contractAddress,
        nft.tokenId,
        demoPrice
      );

      setResults(demoResults);
      setCurrentStep(steps.length);

    } catch (err) {
      console.error('Demo failed:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setResults(null);
    setError(null);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-xl font-bold text-gray-900">🚀 NFT Off-ramp Demo</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-6">
            {/* NFT Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <img
                  src={nft?.image || '/placeholder-nft.png'}
                  alt={nft?.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{nft?.name}</h4>
                  <p className="text-sm text-gray-600">Token #{nft?.tokenId}</p>
                  <p className="text-sm text-green-600 font-medium">Demo Price: 0.001 ETH</p>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Off-ramp Process</h4>
                {results && (
                  <span className="text-sm text-green-600 font-medium">
                    Completed in {((Date.now() - results.summary.completedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                      index < currentStep
                        ? 'border-green-200 bg-green-50'
                        : index === currentStep && isProcessing
                        ? 'border-blue-200 bg-blue-50 animate-pulse'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl mr-3">{step.icon}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{step.name}</p>
                    </div>
                    <div className="ml-3">
                      {index < currentStep ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : index === currentStep && isProcessing ? (
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            {results && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800 mb-3">🎉 Conversion Complete!</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Original NFT:</span>
                    <p className="text-gray-900">{results.summary.originalNFT}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Listed Price:</span>
                    <p className="text-gray-900">{results.summary.listedPrice}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Platform Fee:</span>
                    <p className="text-gray-900">{results.summary.platformFee}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Net Amount:</span>
                    <p className="text-gray-900">{results.summary.netAmount}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">USD Value:</span>
                    <p className="text-gray-900">{results.summary.usdValue}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Native Tokens:</span>
                    <p className="text-green-600 font-bold text-lg">{results.summary.nativeTokens}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Provider:</span> {results.summary.provider} • 
                    <span className="font-medium"> Completed:</span> {results.summary.completedAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-lg font-semibold text-red-800 mb-2">❌ Demo Failed</h4>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {!results && !isProcessing && (
                <button
                  onClick={handleStartDemo}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  🚀 Start Demo Off-ramp
                </button>
              )}
              
              {results && (
                <button
                  onClick={handleReset}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  🔄 Run Demo Again
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Demo Note */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">📝 Demo Note:</span> This is a simulated demonstration for the hackathon. 
                In production, actual buyers would purchase your NFT and real fiat conversion would occur through integrated providers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}