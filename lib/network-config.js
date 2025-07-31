/**
 * Network Configuration for Dual Deployment
 * Supports both Morph Holesky Testnet and Morph Mainnet
 */

// Network definitions
export const morphMainnet = {
  id: 2818,
  name: 'Morph Mainnet',
  network: 'morph',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MORPH_MAINNET_RPC || 'https://rpc-quicknode.morphl2.io'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_MORPH_MAINNET_RPC || 'https://rpc-quicknode.morphl2.io'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Morph Explorer', 
      url: process.env.NEXT_PUBLIC_MORPH_MAINNET_EXPLORER || 'https://explorer.morphl2.io',
      apiUrl: 'https://api.morphscan.io/api'
    },
  },
  testnet: false,
  contracts: {
    menoMarketplace: {
      address: process.env.NEXT_PUBLIC_MAINNET_MENO_MARKETPLACE_ADDRESS,
    },
    fiatOffRamp: {
      address: process.env.NEXT_PUBLIC_MAINNET_FIAT_OFFRAMP_ADDRESS,
    },
    morphOfficialMarketplace: {
      address: process.env.NEXT_PUBLIC_MAINNET_MORPH_OFFICIAL_MARKETPLACE_ADDRESS,
    }
  }
}

export const morphTestnet = {
  id: 2810,
  name: 'Morph Holesky Testnet',
  network: 'morph-holesky',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MORPH_TESTNET_RPC || 'https://rpc-holesky.morphl2.io'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_MORPH_TESTNET_RPC || 'https://rpc-holesky.morphl2.io'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Morph Holesky Explorer', 
      url: process.env.NEXT_PUBLIC_MORPH_TESTNET_EXPLORER || 'https://explorer-holesky.morphl2.io',
      apiUrl: 'https://api-holesky.morphscan.io/api'
    },
  },
  testnet: true,
  faucet: 'https://faucet.quicknode.com/morph/holesky',
  contracts: {
    menoMarketplace: {
      address: process.env.NEXT_PUBLIC_TESTNET_MENO_MARKETPLACE_ADDRESS || '0x773a6fD164e70F4e5581A51dc4176445D9a11A85',
    },
    fiatOffRamp: {
      address: process.env.NEXT_PUBLIC_TESTNET_FIAT_OFFRAMP_ADDRESS,
    },
    morphOfficialMarketplace: {
      address: process.env.NEXT_PUBLIC_TESTNET_MORPH_OFFICIAL_MARKETPLACE_ADDRESS,
    }
  }
}

// Deployment environment detection
export const getDeploymentEnvironment = () => {
  const env = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'development'
  
  if (typeof window !== 'undefined') {
    // Client-side environment detection
    const hostname = window.location.hostname
    
    if (hostname.includes('testnet') || hostname.includes('demo')) {
      return 'testnet'
    } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development'
    } else {
      return 'mainnet'
    }
  }
  
  return env
}

// Get current network based on deployment environment
export const getCurrentNetwork = () => {
  const deploymentEnv = getDeploymentEnvironment()
  
  switch (deploymentEnv) {
    case 'mainnet':
      return morphMainnet
    case 'testnet':
      return morphTestnet
    case 'development':
      // Use testnet for development
      return morphTestnet
    default:
      return morphTestnet
  }
}

// Get all supported networks
export const getSupportedNetworks = () => {
  const deploymentEnv = getDeploymentEnvironment()
  
  if (deploymentEnv === 'development') {
    // In development, support both networks for testing
    return [morphTestnet, morphMainnet]
  } else {
    // In production, only support the current network
    return [getCurrentNetwork()]
  }
}

// Network switching utilities
export const isTestnet = (chainId) => {
  return chainId === morphTestnet.id
}

export const isMainnet = (chainId) => {
  return chainId === morphMainnet.id
}

export const isSupportedNetwork = (chainId) => {
  const supportedNetworks = getSupportedNetworks()
  return supportedNetworks.some(network => network.id === chainId)
}

// Contract address helpers
export const getContractAddress = (contractName, chainId = null) => {
  const network = chainId ? 
    (isTestnet(chainId) ? morphTestnet : morphMainnet) : 
    getCurrentNetwork()
  
  return network.contracts[contractName]?.address
}

// RPC URL helpers
export const getRpcUrl = (chainId = null) => {
  const network = chainId ? 
    (isTestnet(chainId) ? morphTestnet : morphMainnet) : 
    getCurrentNetwork()
  
  return network.rpcUrls.default.http[0]
}

// Explorer URL helpers
export const getExplorerUrl = (chainId = null) => {
  const network = chainId ? 
    (isTestnet(chainId) ? morphTestnet : morphMainnet) : 
    getCurrentNetwork()
  
  return network.blockExplorers.default.url
}

export const getTransactionUrl = (txHash, chainId = null) => {
  const explorerUrl = getExplorerUrl(chainId)
  return `${explorerUrl}/tx/${txHash}`
}

export const getAddressUrl = (address, chainId = null) => {
  const explorerUrl = getExplorerUrl(chainId)
  return `${explorerUrl}/address/${address}`
}

// Network display helpers
export const getNetworkDisplayName = (chainId) => {
  if (isTestnet(chainId)) {
    return 'Morph Testnet'
  } else if (isMainnet(chainId)) {
    return 'Morph Mainnet'
  } else {
    return 'Unknown Network'
  }
}

export const getNetworkColor = (chainId) => {
  if (isTestnet(chainId)) {
    return '#f59e0b' // amber
  } else if (isMainnet(chainId)) {
    return '#10b981' // emerald
  } else {
    return '#6b7280' // gray
  }
}

// Environment-specific configuration
export const getEnvironmentConfig = () => {
  const deploymentEnv = getDeploymentEnvironment()
  const currentNetwork = getCurrentNetwork()
  
  return {
    environment: deploymentEnv,
    network: currentNetwork,
    isProduction: deploymentEnv === 'mainnet',
    isTestnet: deploymentEnv === 'testnet',
    isDevelopment: deploymentEnv === 'development',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    contracts: currentNetwork.contracts,
    rpcUrl: currentNetwork.rpcUrls.default.http[0],
    explorerUrl: currentNetwork.blockExplorers.default.url,
    faucetUrl: currentNetwork.faucet || null
  }
}

// Validation helpers
export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig()
  const errors = []
  
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
    errors.push('NEXT_PUBLIC_PROJECT_ID is required')
  }
  
  // Check contract addresses for production
  if (config.isProduction) {
    if (!config.contracts.menoMarketplace?.address) {
      errors.push('Mainnet Meno Marketplace contract address is required')
    }
    if (!config.contracts.fiatOffRamp?.address) {
      errors.push('Mainnet Fiat Off-ramp contract address is required')
    }
  }
  
  // Check RPC URLs
  if (!config.rpcUrl) {
    errors.push('RPC URL is not configured properly')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    config
  }
}

// Export configuration object for easy access
export const networkConfig = {
  morphMainnet,
  morphTestnet,
  getCurrentNetwork,
  getSupportedNetworks,
  getDeploymentEnvironment,
  getEnvironmentConfig,
  validateEnvironmentConfig,
  isTestnet,
  isMainnet,
  isSupportedNetwork,
  getContractAddress,
  getRpcUrl,
  getExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
  getNetworkDisplayName,
  getNetworkColor
}