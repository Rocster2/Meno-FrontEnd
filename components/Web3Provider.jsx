"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { config } from '../lib/web3-config'
import { 
  getCurrentNetwork, 
  isSupportedNetwork, 
  getNetworkDisplayName,
  getNetworkColor,
  getDeploymentEnvironment 
} from '../lib/network-config'

const queryClient = new QueryClient()

// Network Status Component
function NetworkStatus() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)
  
  const currentNetwork = getCurrentNetwork()
  const deploymentEnv = getDeploymentEnvironment()
  const isCorrectNetwork = chainId === currentNetwork.id
  const isSupportedNet = isSupportedNetwork(chainId)
  
  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      setShowNetworkWarning(true)
    } else {
      setShowNetworkWarning(false)
    }
  }, [isConnected, isCorrectNetwork])
  
  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: currentNetwork.id })
      setShowNetworkWarning(false)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }
  
  if (!isConnected) return null
  
  return (
    <>
      {/* Network Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div 
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 ${
            isCorrectNetwork 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <div 
            className={`w-2 h-2 rounded-full ${
              isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{getNetworkDisplayName(chainId)}</span>
          {deploymentEnv === 'testnet' && (
            <span className="bg-yellow-200 text-yellow-800 px-1 rounded text-xs">
              TESTNET
            </span>
          )}
        </div>
      </div>
      
      {/* Network Warning Modal */}
      {showNetworkWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Wrong Network</h3>
                <p className="text-sm text-gray-600">Please switch to the correct network</p>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Current Network:</span>
                  <span className="font-medium text-red-600">
                    {getNetworkDisplayName(chainId)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Required Network:</span>
                  <span className="font-medium text-green-600">
                    {getNetworkDisplayName(currentNetwork.id)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNetworkWarning(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Continue Anyway
              </button>
              <button
                onClick={handleSwitchNetwork}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Switch Network
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Connection Status Component
function ConnectionStatus() {
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const [showStatus, setShowStatus] = useState(false)
  
  useEffect(() => {
    if (isConnecting || isReconnecting) {
      setShowStatus(true)
      const timer = setTimeout(() => setShowStatus(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isConnecting, isReconnecting])
  
  if (!showStatus) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 flex items-center space-x-2">
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="text-sm font-medium">
          {isConnecting ? 'Connecting wallet...' : 'Reconnecting...'}
        </span>
      </div>
    </div>
  )
}

// Enhanced Web3Provider with network management
function EnhancedWeb3Provider({ children }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">Initializing Web3...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {children}
      <NetworkStatus />
      <ConnectionStatus />
    </>
  )
}

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <EnhancedWeb3Provider>
          {children}
        </EnhancedWeb3Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 