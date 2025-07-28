'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const DebugNFT = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debugContract = async () => {
      console.log('=== DEBUG NFT CONTRACT ===');
      
      const contractAddress = process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS;
      console.log('Contract Address from env:', contractAddress);
      
      if (!contractAddress) {
        setDebugInfo({ error: 'Contract address not found in environment' });
        setLoading(false);
        return;
      }



      try {
        // Simple ABI for basic functions
        const abi = [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function totalSupply() view returns (uint256)",
          "function tokenURI(uint256 tokenId) view returns (string)",
          "function ownerOf(uint256 tokenId) view returns (address)"
        ];

        // Create ethers provider from RPC URL instead of using publicClient directly
        const rpcUrl = 'https://rpc-quicknode-holesky.morphl2.io';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        console.log('Contract instance created:', contract);

        // Test basic contract calls
        const name = await contract.name();
        console.log('Contract name:', name);
        
        const symbol = await contract.symbol();
        console.log('Contract symbol:', symbol);
        
        const totalSupply = await contract.totalSupply();
        console.log('Total supply:', totalSupply.toString());

        let tokenInfo = null;
        if (totalSupply.toString() !== '0') {
          try {
            const tokenURI = await contract.tokenURI(0);
            const owner = await contract.ownerOf(0);
            
            tokenInfo = {
              tokenId: 0,
              tokenURI,
              owner
            };
            
            console.log('Token 0 info:', tokenInfo);
          } catch (tokenError) {
            console.error('Error getting token 0 info:', tokenError);
          }
        }

        setDebugInfo({
          contractAddress,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          tokenInfo,
          success: true
        });

      } catch (error) {
        console.error('Contract debug error:', error);
        setDebugInfo({
          contractAddress,
          error: error.message,
          success: false
        });
      }
      
      setLoading(false);
    };

    debugContract();
  }, []);

  if (loading) {
    return <div className="p-4 bg-yellow-100 rounded">Loading debug info...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 NFT Contract Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <div><strong>Contract Address:</strong> {debugInfo.contractAddress || 'Not found'}</div>
        
        {debugInfo.success ? (
          <>
            <div><strong>Name:</strong> {debugInfo.name}</div>
            <div><strong>Symbol:</strong> {debugInfo.symbol}</div>
            <div><strong>Total Supply:</strong> {debugInfo.totalSupply}</div>
            
            {debugInfo.tokenInfo && (
              <div className="mt-4 p-2 bg-green-100 rounded">
                <strong>Token 0 Info:</strong>
                <div>Owner: {debugInfo.tokenInfo.owner}</div>
                <div>Token URI: {debugInfo.tokenInfo.tokenURI}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-red-600">
            <strong>Error:</strong> {debugInfo.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugNFT;