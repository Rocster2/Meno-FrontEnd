"use client";

import { useState } from 'react';
import { useServices } from '../contexts/ServiceContext';

export default function TransactionRetryModal({ transaction, isOpen, onClose, onRetrySuccess }) {
  const { services } = useServices();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [gasAdjustment, setGasAdjustment] = useState(20); // 20% increase by default

  const handleRetry = async () => {
    if (!services?.transactionManager || !transaction) return;

    setRetrying(true);
    setRetryError(null);

    try {
      // Create a new transaction request based on the failed one
      const retryRequest = {
        ...transaction.request,
        // Increase gas limit by the adjustment percentage
        gasLimit: transaction.gasEstimate ? 
          transaction.gasEstimate + (transaction.gasEstimate * BigInt(gasAdjustment) / 100n) :
          undefined
      };

      const result = await services.transactionManager.executeTransaction(retryRequest);
      
      console.log('✅ Transaction retry initiated:', result);
      onRetrySuccess?.(result);
      onClose();

    } catch (error) {
      console.error('❌ Transaction retry failed:', error);
      setRetryError(error.message);
    } finally {
      setRetrying(false);
    }
  };

  const formatTransactionType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getFailureReason = (error) => {
    if (!error) return 'Unknown error';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('insufficient funds')) {
      return 'Insufficient funds for gas fees';
    } else if (errorLower.includes('gas')) {
      return 'Gas-related issue (too low or network congestion)';
    } else if (errorLower.includes('nonce')) {
      return 'Transaction nonce conflict';
    } else if (errorLower.includes('timeout')) {
      return 'Network timeout';
    } else if (errorLower.includes('rejected')) {
      return 'Transaction rejected by user or network';
    } else {
      return error;
    }
  };

  const getRecommendedAction = (error) => {
    if (!error) return 'Try again with higher gas fees';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('insufficient funds')) {
      return 'Add more ETH to your wallet for gas fees';
    } else if (errorLower.includes('gas')) {
      return 'Increase gas limit and try again';
    } else if (errorLower.includes('nonce')) {
      return 'Wait a moment and try again';
    } else if (errorLower.includes('timeout')) {
      return 'Check network connection and retry';
    } else {
      return 'Review transaction details and try again';
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">🔄</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Retry Transaction</h3>
              <p className="text-sm text-gray-600">Attempt to resend failed transaction</p>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Transaction Type:</span>
                <span className="text-sm font-medium">{formatTransactionType(transaction.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium text-red-600">Failed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Attempts:</span>
                <span className="text-sm font-medium">{transaction.attempts || 1}</span>
              </div>
              {transaction.gasEstimate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Original Gas:</span>
                  <span className="text-sm font-medium">{Number(transaction.gasEstimate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Information */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Failure Reason</h4>
            <p className="text-sm text-red-700 mb-3">{getFailureReason(transaction.error)}</p>
            <div className="bg-red-100 rounded p-3">
              <p className="text-sm text-red-800">
                <strong>Recommended:</strong> {getRecommendedAction(transaction.error)}
              </p>
            </div>
          </div>

          {/* Gas Adjustment */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Gas Limit Adjustment
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={gasAdjustment}
                onChange={(e) => setGasAdjustment(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12">+{gasAdjustment}%</span>
            </div>
            <p className="text-xs text-gray-600">
              Increase gas limit to improve success chances. Higher values cost more but are more likely to succeed.
            </p>
          </div>

          {/* Retry Error */}
          {retryError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Retry Failed:</strong> {retryError}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={retrying}
          >
            Cancel
          </button>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {retrying ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Retrying...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Retry Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}