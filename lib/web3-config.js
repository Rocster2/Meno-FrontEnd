import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

// 1. Define Morph chains
const morphMainnet = {
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
      http: ['https://rpc-quicknode.morphl2.io'],
    },
    public: {
      http: ['https://rpc-quicknode.morphl2.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Morph Explorer', url: 'https://explorer.morphl2.io' },
  },
  testnet: false,
}

const morphTestnet = {
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
      http: ['https://rpc-quicknode-holesky.morphl2.io'],
    },
    public: {
      http: ['https://rpc-quicknode-holesky.morphl2.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Morph Holesky Explorer', url: 'https://explorer-holesky.morphl2.io' },
  },
  testnet: true,
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

// 4. Define chains
const chains = [morphMainnet, morphTestnet, mainnet, sepolia]

// 5. Create wagmi config
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  storage: createStorage({
    storage: cookieStorage
  }),
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
})

// 6. Create Web3Modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains,
  defaultChain: morphMainnet,
  enableAnalytics: true,
  enableOnramp: true,
  features: {
    email: true,
    socials: ['google', 'x', 'github', 'discord', 'apple'],
    emailShowWallets: true,
  }
})

export { config } 