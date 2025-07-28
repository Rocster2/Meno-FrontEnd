"use client";

import { useState, useEffect } from 'react';
import { useServices } from '../contexts/ServiceContext';
import TransactionMonitor from './TransactionMonitor';

export default function TransactionStatusIndicator() {
  const { services, isConnected } = useServices();
  const [stats, setStats] = useState(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Update stats periodically
  useEffect(() => {
    if (services?.transactionManager && isConnected) {
      const updateStats = () => {
        const transactionStats = services.transactionManager.getStats();
        setStats(transactionStats);
        
        // Show indicator if there are pending transactions or recent activity
        const shouldShow = transactionStats.pendingTransactions > 0 || 
                          transactionStats.totalTransactions > 0;
        setIsVisible(shouldShow);
      };

      // Initial update
      updateStats();

      // Set up periodic updates
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds

      // Listen to transaction events for real-time updates
      const transactionManager = services.transactionManager;
      
      const handleTransactionEvent = () => {
        updateStats();
      };

      transactionManager.on('transactionCreated', handleTransactionEvent);
      transactionManager.on('transactionSent', handleTransactionEvent);
      transactionManager.on('transactionConfirmed', handleTransactionEvent);
      transactionManager.on('transactionFailed', handleTransactionEvent);

      return () => {
        clearInterval(interval);
        transactionManager.off('transactionCreated', handleTransactionEvent);
        transactionManager.off('transactionSent', handleTransactionEvent);
        transactionManager.off('transactionConfirmed', handleTransactionEvent);
        transactionManager.off('transactionFailed', handleTransactionEvent);
      };
    }
  }, [services, isConnected]);

  if (!isVisible || !stats) return null;

  const getStatusColor = () => {
    if (stats.pendingTransactions > 0) return 'bg-yellow-500';
    if (stats.failedTransactions > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (stats.pendingTransactions > 0) {
      return `${stats.pendingTransactions} pending`;
    }
    if (stats.failedTransactions > 0) {
      return `${stats.failedTransactions} failed`;
    }
    return 'All confirmed';
  };

  const getStatusIcon = () => {
    if (stats.pendingTransactions > 0) return '⏳';
    if (stats.failedTransactions > 0) return '❌';
    return '✅';
  };

  return (
    <>
      {/* Floating Transaction Status Indicator */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setShowMonitor(true)}
          className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg hover:bg-gray-800 transition-colors flex items-center space-x-3 min-w-[200px]"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
              {stats.pendingTransactions > 0 && (
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
              )}
            </div>
            <span className="text-sm font-medium text-white">
              {getStatusIcon()} {getStatusText()}
            </span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-400">
              {stats.totalTransactions} total
            </div>
            <div className="text-xs text-gray-400">
              {stats.successRate} success
            </div>
          </div>
        </button>
      </div>

      {/* Transaction Monitor Modal */}
      <TransactionMonitor 
        isOpen={showMonitor}
        onClose={() => setShowMonitor(false)}
      />
    </>
  );
}