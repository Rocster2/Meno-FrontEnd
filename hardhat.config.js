require('@nomicfoundation/hardhat-toolbox')
require('@nomicfoundation/hardhat-verify')
require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable intermediate representation for better optimization
    },
  },
  
  networks: {
    // Morph Holesky Testnet Configuration
    morphHolesky: {
      url: process.env.NEXT_PUBLIC_MORPH_TESTNET_RPC || 'https://rpc-quicknode-holesky.morphl2.io',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2810,
      gasPrice: 2000000000, // 2 gwei
      gas: 8000000,
      timeout: 60000,
      confirmations: 1,
    },
    
    // Morph Mainnet Configuration
    morphMainnet: {
      url: process.env.NEXT_PUBLIC_MORPH_MAINNET_RPC || 'https://rpc-quicknode.morphl2.io',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2818,
      gasPrice: 2000000000, // 2 gwei
      gas: 8000000,
      timeout: 60000,
      confirmations: 2, // More confirmations for mainnet
    },
    
    // Local development network
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    
    // Hardhat network for testing
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
    },
  },
  
  // Contract verification configuration
  etherscan: {
    apiKey: {
      morphHolesky: process.env.MORPH_TESTNET_API_KEY || 'dummy-key',
      morphMainnet: process.env.MORPH_MAINNET_API_KEY || 'dummy-key',
    },
    customChains: [
      {
        network: 'morphHolesky',
        chainId: 2810,
        urls: {
          apiURL: 'https://explorer-api-holesky.morphl2.io/api',
          browserURL: 'https://explorer-holesky.morphl2.io/',
        },
      },
      {
        network: 'morphMainnet',
        chainId: 2818,
        urls: {
          apiURL: 'https://api.morphscan.io/api',
          browserURL: 'https://explorer.morphl2.io/',
        },
      },
    ],
  },
  
  // Gas reporting configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    gasPrice: 2, // gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  // Mocha test configuration
  mocha: {
    timeout: 40000,
  },
  
  // Path configuration
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}