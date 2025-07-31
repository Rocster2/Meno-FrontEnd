import { createConfig, http } from 'wagmi'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
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
  console.warn('⚠️ Environment configuration warnings:', envValidation.errors)
}

// Get current network configuration
const supportedNetworks = getSupportedNetworks()
const currentNetwork = getCurrentNetwork()
const deploymentEnv = getDeploymentEnvironment()

// Create wagmi config with simplified setup
const config = createConfig({
  chains: supportedNetworks,
  connectors: [
    injected(),
    metaMask(),
    // Only include WalletConnect if we have a valid project ID
    ...(process.env.NEXT_PUBLIC_PROJECT_ID && process.env.NEXT_PUBLIC_PROJECT_ID !== 'demo-project-id' 
      ? [walletConnect({ 
          projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
          metadata: {
            name: 'Meno NFT Marketplace',
            description: 'Off-ramp NFT to Fiat seamlessly on Morph Layer 2',
            url: 'https://meno-nft.com',
            icons: ['https://meno-nft.com/meno.svg']
          }
        })]
      : []
    )
  ],
  transports: {
    [morphTestnet.id]: http(morphTestnet.rpcUrls.default.http[0]),
    [morphMainnet.id]: http(morphMainnet.rpcUrls.default.http[0]),
  },
})

export { config } 