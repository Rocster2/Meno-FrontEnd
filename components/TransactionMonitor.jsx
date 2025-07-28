"use client";

import { useState, useEffect } from 'react';
import { useServices } from '../contexts/ServiceContext';
import { getTransactionUrl } from '../lib/network-config';

export default function TransactionMonitor({ isOpen, onClose }) {
  const { services, userAddress } = useServices();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user transactions
  useEffect(() => {
    if (services?.transactionManager && userAddress && isOpen) {
      fetchTransactions();
      fetchStats();
      
      // Set up real-time updates
      const transactionManager = services.transactionManager;
      
      const handleTransactionUpdate = (transaction) => {
        if (transaction.request.from?.toLowerCase() === userAddress.toLowerCase()) {
          fetchTransactions();
          fetchStats();
        }
      };

      // Listen to transaction events
      transactionManager.on('transactionCreated', handleTransactionUpdate);
      transactionManager.on('transactionSent', handleTransactionUpdate);
      transactionManager.on('transactionConfirmed', handleTransactionUpdate);
      transactionManager.on('transactionFailed', handleTransactionUpdate);
      transactionManager.on('transactionCancelled', handleTransactionUpdate);

      return () => {
        transactionManager.off('transactionCreated', handleTransactionUpdate);
        transactionManager.off('transactionSent', handleTransactionUpdate);
        transactionManager.off('transactionConfirmed', handleTransactionUpdate);
        transactionManager.off('transactionFailed', handleTransactionUpdate);
        transactionManager.off('transactionCancelled', handleTransactionUpdate);
      };
    }
  }, [services, userAddress, isOpen]);

  const fetchTransactions = () => {
    if (services?.transactionManager && userAddress) {
      const userTransactions = services.transactionManager.getUserTransactions(userAddress);
      setTransactions(userTransactions);
    }
  };

  const fetchStats = () => {
    if (services?.transactionManager) {
      const transactionStats = services.transactionManager.getStats();
      setStats(transactionStats);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
    fetchTransactions();
    fetchStats();
    setRefreshing(false);
  };

  const handleCancelTransaction = async (transactionId) => {
    try {
      await services.transactionManager.cancelTransaction(transactionId);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to cancel transaction:', error);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'pending') return tx.status === 'pending' || tx.status === 'sending';
    if (filter === 'confirmed') return tx.status === 'confirmed';
    if (filter === 'failed') return tx.status === 'failed';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': case 'sending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return '✅';
      case 'pending': case 'sending': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '📄';
    }
  };

  const formatTransactionType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Transaction Monitor</h2>
            <p className="text-sm text-gray-600">Track your blockchain transactions in real-time</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.successfulTransactions}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingTransactions}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.successRate}</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {['all', 'pending', 'confirmed', 'failed'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    filter === filterOption
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filterOption}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You haven't made any transactions yet"
                  : `No ${filter} transactions found`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getStatusIcon(transaction.status)}</div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatTransactionType(transaction.type)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTimeAgo(transaction.createdAt)}
                        </div>
                        {transaction.hash && (
                          <a
                            href={getTransactionUrl(transaction.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View on Explorer →
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </div>
                      {transaction.gasUsed && (
                        <div className="text-sm text-gray-600 mt-1">
                          Gas: {Number(transaction.gasUsed).toLocaleString()}
                        </div>
                      )}
                      {transaction.status === 'pending' && (
                        <button
                          onClick={() => handleCancelTransaction(transaction.id)}
                          className="text-sm text-red-600 hover:underline mt-1"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {transaction.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {transaction.error}
                      </div>
                    </div>
                  )}
                  
                  {transaction.retryCount > 0 && (
                    <div className="mt-2 text-sm text-yellow-600">
                      Retried {transaction.retryCount} time{transaction.retryCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-center text-sm text-gray-600">
            Transactions are monitored in real-time. Status updates automatically.
          </div>
        </div>
      </div>
    </div>
  );
}