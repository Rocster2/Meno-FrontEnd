"use client";

import { useAccount, useDisconnect, useConnect } from 'wagmi'
import Modal from "../Modal";
import { Wallet, LogOut, User, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function LoginModal({ isOpen, onClose }) {
   const { address, isConnected, chainId } = useAccount()
   const { disconnect } = useDisconnect()
   const { connect, connectors, isPending } = useConnect()
   const [copied, setCopied] = useState(false)

   const handleConnect = async (connector) => {
      try {
         await connect({ connector })
         onClose()
      } catch (error) {
         console.error('Connection failed:', error)
      }
   }

   const handleDisconnect = async () => {
      await disconnect()
      onClose()
   }

   const copyAddress = async () => {
      if (address) {
         await navigator.clipboard.writeText(address)
         setCopied(true)
         setTimeout(() => setCopied(false), 2000)
      }
   }

   const formatAddress = (addr) => {
      if (!addr) return ''
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`
   }

   const getNetworkName = (chainId) => {
      switch (chainId) {
         case 2818: return 'Morph Mainnet'
         case 2810: return 'Morph Holesky'
         case 1: return 'Ethereum Mainnet'
         case 11155111: return 'Sepolia Testnet'
         default: return 'Unknown Network'
      }
   }

   const getExplorerUrl = (chainId, address) => {
      switch (chainId) {
         case 2818: return `https://explorer.morphl2.io/address/${address}`
         case 2810: return `https://explorer-holesky.morphl2.io/address/${address}`
         case 1: return `https://etherscan.io/address/${address}`
         case 11155111: return `https://sepolia.etherscan.io/address/${address}`
         default: return '#'
      }
   }

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={isConnected ? "Account" : "Connect Wallet"}>
         <div className="space-y-6">
            {!isConnected ? (
               // Connection State
               <div className="space-y-4">
                  <p className="text-gray-300 text-center">
                     Choose how you'd like to connect to Meno
                  </p>
                  
                  <div className="space-y-3">
                     {/* Available Connectors */}
                     {connectors.map((connector) => (
                        <button
                           key={connector.uid}
                           onClick={() => handleConnect(connector)}
                           disabled={isPending}
                           className="wallet-button flex items-center gap-3 justify-center group disabled:opacity-50 disabled:cursor-not-allowed">
                           <Wallet className="w-5 h-5 text-menoGreen" />
                           <span>
                              {isPending ? 'Connecting...' : `Connect ${connector.name}`}
                           </span>
                        </button>
                     ))}

                     <div className="text-center text-sm text-gray-400">
                        <p>Connect your wallet to access Meno</p>
                        <p className="text-menoGreen">Secure • Fast • Decentralized</p>
                     </div>
                  </div>
               </div>
            ) : (
               // Connected State
               <div className="space-y-4">
                  {/* Account Info */}
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-menoGreen rounded-full flex items-center justify-center">
                           <User className="w-5 h-5 text-black" />
                        </div>
                        <div>
                           <p className="font-medium">Connected Account</p>
                           <p className="text-sm text-gray-400">{getNetworkName(chainId)}</p>
                        </div>
                     </div>

                     {/* Address */}
                     <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
                        <code className="text-sm text-menoGreen flex-1">
                           {formatAddress(address)}
                        </code>
                        <button
                           onClick={copyAddress}
                           className="text-gray-400 hover:text-white transition-colors"
                           title="Copy address">
                           <Copy className="w-4 h-4" />
                        </button>
                        <a
                           href={getExplorerUrl(chainId, address)}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-gray-400 hover:text-white transition-colors"
                           title="View on explorer">
                           <ExternalLink className="w-4 h-4" />
                        </a>
                     </div>

                     {copied && (
                        <p className="text-xs text-menoGreen text-center">
                           Address copied to clipboard!
                        </p>
                     )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                     <button
                        onClick={handleDisconnect}
                        className="wallet-button bg-red-600 hover:bg-red-700 flex items-center gap-3 justify-center">
                        <LogOut className="w-5 h-5" />
                        <span>Disconnect</span>
                     </button>
                  </div>
               </div>
            )}
         </div>
      </Modal>
   );
}
