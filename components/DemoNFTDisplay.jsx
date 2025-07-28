'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import DemoNFTService from '../lib/services/DemoNFTService';

const DemoNFTDisplay = () => {
  const { address, isConnected } = useAccount();
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDemoNFT = async () => {
      console.log('DemoNFTDisplay: Starting to load demo NFT...');
      console.log('Contract Address:', process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS);
      
      try {
        setLoading(true);
        setError(null);

        console.log('Initializing DemoNFTService...');
        const demoService = new DemoNFTService();
        await demoService.initialize(null); // We'll use RPC directly now
        
        console.log('Getting all demo NFTs...');
        const data = await demoService.getAllDemoNFTs();
        console.log('Demo data received:', data);
        
        setDemoData(data);
      } catch (err) {
        console.error('Error loading demo NFT:', err);
        setError(err.message);
        
        // Retry once after a short delay
        setTimeout(async () => {
          try {
            console.log('Retrying NFT load...');
            const demoService = new DemoNFTService();
            await demoService.initialize(null);
            const data = await demoService.getAllDemoNFTs();
            setDemoData(data);
            setError(null);
          } catch (retryErr) {
            console.error('Retry also failed:', retryErr);
          }
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    loadDemoNFT();
  }, []); // Remove publicClient dependency

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your demo NFT...</p>
          <p className="text-xs text-gray-400 mt-2">Contract: {process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Demo NFT</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <p className="text-xs text-gray-600 mt-1">Contract: {process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!demoData || demoData.nfts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">No Demo NFT Found</h3>
            <p className="text-sm text-yellow-700 mt-1">The demo NFT hasn't been minted yet or there was an issue loading it.</p>
            <div className="mt-2 text-xs text-gray-600">
              <p>Contract: {process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS}</p>
              <p>Demo Data: {JSON.stringify(demoData)}</p>
              <p>Check browser console for detailed logs</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nft = demoData.nfts[0];
  const contractInfo = demoData.contractInfo;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">🎯 Hackathon Demo NFT</h2>
            <p className="text-purple-100 text-sm">Deployed on Morph Holesky Testnet</p>
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1">
            <span className="text-white text-xs font-medium">DEMO</span>
          </div>
        </div>
      </div>

      {/* NFT Display */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="space-y-4">
            {nft.image ? (
              <div className="relative">
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/300/300';
                  }}
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Live on Morph
                </div>
              </div>
            ) : (
              <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm mt-2">NFT Image</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <a
                href={nft.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-center text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                View on Explorer
              </a>
              <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                List for Sale
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{nft.name}</h3>
              <p className="text-gray-600 text-sm mt-1">{nft.description}</p>
            </div>

            {/* NFT Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Token ID</span>
                <span className="text-sm text-gray-900 font-mono">#{nft.tokenId}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Collection</span>
                <span className="text-sm text-gray-900">{nft.collection.name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Network</span>
                <span className="text-sm text-gray-900">{nft.network}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Owner</span>
                <span className="text-sm text-gray-900 font-mono">
                  {isConnected && address?.toLowerCase() === nft.owner.toLowerCase() ? (
                    <span className="text-green-600 font-medium">You</span>
                  ) : (
                    `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`
                  )}
                </span>
              </div>
            </div>

            {/* Attributes */}
            {nft.attributes && nft.attributes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attributes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {nft.attributes.map((attr, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-blue-600 font-medium">{attr.trait_type}</div>
                      <div className="text-sm text-blue-900 font-semibold">{attr.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Info */}
            {contractInfo && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Contract Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address</span>
                    <span className="font-mono text-gray-900">
                      {contractInfo.address.slice(0, 8)}...{contractInfo.address.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Supply</span>
                    <span className="text-gray-900">{contractInfo.totalSupply}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoNFTDisplay;