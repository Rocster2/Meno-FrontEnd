'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const NFTDebugger = () => {
  const { address, isConnected } = useAccount();
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testRPCConnection = async () => {
    setLoading(true);
    addLog('Testing RPC connection...', 'info');
    
    try {
      const rpcUrl = 'https://rpc-quicknode-holesky.morphl2.io';
      addLog(`Using RPC: ${rpcUrl}`, 'info');
      
      // Test basic RPC call
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const data = await response.json();
      
      if (data.result) {
        addLog(`✅ RPC Connection successful. Block: ${parseInt(data.result, 16)}`, 'success');
        setDebugInfo(prev => ({ ...prev, rpcWorking: true, blockNumber: parseInt(data.result, 16) }));
      } else {
        addLog(`❌ RPC Error: ${JSON.stringify(data)}`, 'error');
        setDebugInfo(prev => ({ ...prev, rpcWorking: false, rpcError: data }));
      }
    } catch (error) {
      addLog(`❌ RPC Connection failed: ${error.message}`, 'error');
      setDebugInfo(prev => ({ ...prev, rpcWorking: false, rpcError: error.message }));
    }
    
    setLoading(false);
  };

  const testContractCall = async () => {
    setLoading(true);
    addLog('Testing contract call...', 'info');
    
    try {
      const contractAddress = process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS;
      addLog(`Contract address: ${contractAddress}`, 'info');
      
      if (!contractAddress) {
        addLog('❌ Contract address not found in environment', 'error');
        return;
      }
      
      const rpcUrl = 'https://rpc-quicknode-holesky.morphl2.io';
      
      // Test contract call - get total supply
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: contractAddress,
            data: '0x18160ddd' // totalSupply() function selector
          }, 'latest'],
          id: 2
        })
      });
      
      const data = await response.json();
      
      if (data.result) {
        const totalSupply = parseInt(data.result, 16);
        addLog(`✅ Contract call successful. Total supply: ${totalSupply}`, 'success');
        setDebugInfo(prev => ({ ...prev, contractWorking: true, totalSupply }));
      } else {
        addLog(`❌ Contract call failed: ${JSON.stringify(data)}`, 'error');
        setDebugInfo(prev => ({ ...prev, contractWorking: false, contractError: data }));
      }
    } catch (error) {
      addLog(`❌ Contract call error: ${error.message}`, 'error');
      setDebugInfo(prev => ({ ...prev, contractWorking: false, contractError: error.message }));
    }
    
    setLoading(false);
  };

  const testIPFSAccess = async () => {
    setLoading(true);
    addLog('Testing IPFS access...', 'info');
    
    try {
      const metadataCID = process.env.NEXT_PUBLIC_NFT_METADATA_CID;
      const ipfsUrl = `https://ipfs.io/ipfs/${metadataCID}`;
      addLog(`Testing IPFS URL: ${ipfsUrl}`, 'info');
      
      const response = await fetch(ipfsUrl);
      
      if (response.ok) {
        const metadata = await response.json();
        addLog(`✅ IPFS access successful`, 'success');
        addLog(`Metadata: ${JSON.stringify(metadata, null, 2)}`, 'info');
        setDebugInfo(prev => ({ ...prev, ipfsWorking: true, metadata }));
      } else {
        addLog(`❌ IPFS access failed: ${response.status} ${response.statusText}`, 'error');
        setDebugInfo(prev => ({ ...prev, ipfsWorking: false, ipfsError: `${response.status} ${response.statusText}` }));
      }
    } catch (error) {
      addLog(`❌ IPFS error: ${error.message}`, 'error');
      setDebugInfo(prev => ({ ...prev, ipfsWorking: false, ipfsError: error.message }));
    }
    
    setLoading(false);
  };

  const runAllTests = async () => {
    setLogs([]);
    setDebugInfo({});
    addLog('Starting comprehensive debug tests...', 'info');
    
    await testRPCConnection();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between calls
    await testContractCall();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testIPFSAccess();
    
    addLog('All tests completed!', 'success');
  };

  const clearLogs = () => {
    setLogs([]);
    setDebugInfo({});
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🔧 NFT Debug Console</h2>
        <div className="flex space-x-2">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearLogs}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">Environment Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Wallet Connected:</span> {isConnected ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <span className="font-medium">Address:</span> {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </div>
          <div>
            <span className="font-medium">Contract:</span> {process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS || 'Not set'}
          </div>
          <div>
            <span className="font-medium">Network:</span> Morph Holesky (2810)
          </div>
        </div>
      </div>

      {/* Individual Test Buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={testRPCConnection}
          disabled={loading}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Test RPC
        </button>
        <button
          onClick={testContractCall}
          disabled={loading}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          Test Contract
        </button>
        <button
          onClick={testIPFSAccess}
          disabled={loading}
          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
        >
          Test IPFS
        </button>
      </div>

      {/* Status Summary */}
      {Object.keys(debugInfo).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Status Summary</h3>
          <div className="space-y-1 text-sm">
            <div>RPC Connection: {debugInfo.rpcWorking ? '✅ Working' : '❌ Failed'}</div>
            <div>Contract Access: {debugInfo.contractWorking ? '✅ Working' : '❌ Failed'}</div>
            <div>IPFS Access: {debugInfo.ipfsWorking ? '✅ Working' : '❌ Failed'}</div>
            {debugInfo.totalSupply !== undefined && (
              <div>Total NFTs: {debugInfo.totalSupply}</div>
            )}
          </div>
        </div>
      )}

      {/* Debug Logs */}
      <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-green-400">Debug Logs</h3>
          <span className="text-gray-400 text-xs">{logs.length} entries</span>
        </div>
        
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm">No logs yet. Click "Run All Tests" to start debugging.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono">
                <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                <span className={
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTDebugger;