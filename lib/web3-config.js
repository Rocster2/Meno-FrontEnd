import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { 
  morphMainnet, 
  morphTestnet, 
  getSupportedNetworks, 
  getCurrentNetwork,
  getDeploymentEnvironment,
  validateEnvironmentConfig,
  getEnvironmentConfig
} from './network-config'

// Export network configurations for use in other services
export { morphMainnet, morphTestnet }

// Validate environment configuration on startup
const envValidation = validateEnvironmentConfig()
if (!envValidation.isValid) {
  console.error('❌ Environment configuration errors:', envValidation.errors)
  if (getDeploymentEnvironment() === 'mainnet') {
    throw new Error('Invalid environment configuration for production deployment')
  }
}

// 2. Get projectId from WalletConnect Cloud
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'demo-project-id'

if (!projectId) throw new Error('Project ID is not defined')

// 3. Create metadata
const metadata = {
  name: 'Meno NFT Marketplace',
  description: 'Off-ramp NFT to Fiat seamlessly on Morph Layer 2',
  url: 'https://meno-nft.com', // Your app URL
  icons: ['https://meno-nft.com/meno.svg']
}

// 4. Define chains based on deployment environment
const supportedNetworks = getSupportedNetworks()
const currentNetwork = getCurrentNetwork()
const deploymentEnv = getDeploymentEnvironment()

// Include Ethereum networks for development and cross-chain functionality
const chains = deploymentEnv === 'development' 
  ? [...supportedNetworks, mainnet, sepolia]
  : [...supportedNetworks]

// 5. Create wagmi config with environment-aware settings
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    ...metadata,
    description: `${metadata.description} - ${deploymentEnv.toUpperCase()} Environment`
  },
  storage: createStorage({
    storage: cookieStorage
  }),
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
})

// 6. Create Web3Modal with environment-specific configuration
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains,
  defaultChain: currentNetwork,
  enableAnalytics: deploymentEnv === 'mainnet', // Only enable analytics in production
  enableOnramp: true,
  features: {
    email: true,
    socials: ['google', 'x', 'github', 'discord', 'apple'],
    emailShowWallets: true,
  },
  themeMode: deploymentEnv === 'testnet' ? 'dark' : 'light', // Visual distinction for testnet
  themeVariables: deploymentEnv === 'testnet' ? {
    '--w3m-accent': '#f59e0b', // Amber accent for testnet
    '--w3m-background-color': '#1f2937' // Dark background for testnet
  } : {}
})

export { config } 