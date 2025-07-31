'use client';

import { useState, useEffect } from 'react';

/**
 * Transaction Progress Component
 * Shows the progress of a blockchain transaction
 */
export default function TransactionProgress({ 
  isVisible, 
  onClose, 
  stage = 'preparing', // preparing, signing, confirming, success, error
  transactionHash = null,
  error = null,
  explorerUrl = "https://explorer-holesky.morphl2.io"
}) {
  const [dots, setDots] = useState('');

  // Animate loading dots
  useEffect(() => {
    if (stage === 'signing' || stage === 'confirming') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [stage]);

  if (!isVisible) return null;

  const getStageInfo = () => {
    switch (stage) {
      case 'preparing':
        return {
          title: 'Preparing Transaction',
          message: 'Setting up your NFT listing...',
          icon: '⚙️',
          color: 'blue'
        };
      case 'signing':
        return {
          title: 'Waiting for Signature',
          message: `Please confirm the transaction in your wallet${dots}`,
          icon: '✍️',
          color: 'yellow'
        };
      case 'confirming':
        return {
          title: 'Confirming Transaction',
          message: `Transaction submitted, waiting for confirmation${dots}`,
          icon: '⏳',
          color: 'blue'
        };
      case 'success':
        return {
          title: 'Transaction Successful!',
          message: 'Your NFT has been listed for sale.',
          icon: '✅',
          color: 'green'
        };
      case 'pending':
        return {
          title: 'Transaction Pending',
          message: 'Transaction sent successfully. Confirmation may take a few minutes due to network congestion.',
          icon: '⏳',
          color: 'yellow'
        };
      case 'error':
        return {
          title: 'Transaction Failed',
          message: error || 'Something went wrong. Please try again.',
          icon: '❌',
          color: 'red'
        };
      default:
        return {
          title: 'Processing',
          message: 'Please wait...',
          icon: '⏳',
          color: 'blue'
        };
    }
  };

  const stageInfo = getStageInfo();
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Progress</h3>
            {(stage === 'success' || stage === 'error') && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="px-6 py-6">
            <div className={`rounded-lg border p-4 ${colorClasses[stageInfo.color]}`}>
              <div className="flex items-center">
                <div className="text-2xl mr-3">{stageInfo.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{stageInfo.title}</h4>
                  <p className="text-sm mt-1">{stageInfo.message}</p>
                </div>
              </div>
            </div>

            {/* Transaction Hash */}
            {transactionHash && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Transaction Hash:</p>
                <div className="flex items-center justify-between">
                  <code className="text-xs text-gray-600 break-all">
                    {transactionHash.slice(0, 20)}...{transactionHash.slice(-20)}
                  </code>
                  <a
                    href={`${explorerUrl}/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    View
                  </a>
                </div>
              </div>
            )}

            {/* Progress Steps */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className={`flex items-center ${stage === 'preparing' || stage === 'signing' || stage === 'confirming' || stage === 'success' ? 'text-blue-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${stage === 'preparing' || stage === 'signing' || stage === 'confirming' || stage === 'success' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  Prepare
                </div>
                <div className={`flex items-center ${stage === 'signing' || stage === 'confirming' || stage === 'success' ? 'text-blue-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${stage === 'signing' || stage === 'confirming' || stage === 'success' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  Sign
                </div>
                <div className={`flex items-center ${stage === 'confirming' || stage === 'success' ? 'text-blue-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${stage === 'confirming' || stage === 'success' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  Confirm
                </div>
                <div className={`flex items-center ${stage === 'success' ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${stage === 'success' ? 'bg-green-600' : 'bg-gray-300'}`} />
                  Complete
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {stage === 'error' && (
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            )}

            {stage === 'success' && (
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            )}

            {stage === 'pending' && (
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  Continue (Check Status Later)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}