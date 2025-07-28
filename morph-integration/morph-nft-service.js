import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseAbi 
} from 'viem'
import { morphMainnet } from '@/lib/web3-config'

// Morph NFT Marketplace Contract (replace with actual contract address)
const MORPH_NFT_MARKETPLACE_ADDRESS = '0x...'

// ABI for Morph NFT Marketplace (simplified example)
const MORPH_NFT_MARKETPLACE_ABI = parseAbi([
  'function listNFT(address nftContract, uint256 tokenId, uint256 price) external',
  'function buyNFT(address nftContract, uint256 tokenId) external payable',
  'function getNFTListing(address nftContract, uint256 tokenId) external view returns (address seller, uint256 price, bool isActive)',
  'function getUserNFTs(address user) external view returns (tuple(address nftContract, uint256 tokenId)[])'
])

class MorphNFTService {
  constructor(walletClient) {
    this.publicClient = createPublicClient({
      chain: morphMainnet,
      transport: http()
    })
    this.walletClient = walletClient
  }

  // Fetch user's NFTs from Morph marketplace
  async fetchUserNFTs(userAddress) {
    try {
      const userNFTs = await this.publicClient.readContract({
        address: MORPH_NFT_MARKETPLACE_ADDRESS,
        abi: MORPH_NFT_MARKETPLACE_ABI,
        functionName: 'getUserNFTs',
        args: [userAddress]
      })
      return userNFTs
    } catch (error) {
      console.error('Error fetching user NFTs:', error)
      return []
    }
  }

  // List NFT for sale
  async listNFTForSale(nftContract, tokenId, price) {
    try {
      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: MORPH_NFT_MARKETPLACE_ADDRESS,
        abi: MORPH_NFT_MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [nftContract, tokenId, price],
        account
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error listing NFT:', error)
      throw error
    }
  }

  // Buy NFT
  async buyNFT(nftContract, tokenId, price) {
    try {
      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: MORPH_NFT_MARKETPLACE_ADDRESS,
        abi: MORPH_NFT_MARKETPLACE_ABI,
        functionName: 'buyNFT',
        args: [nftContract, tokenId],
        account,
        value: price
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error buying NFT:', error)
      throw error
    }
  }

  // Get NFT listing details
  async getNFTListingDetails(nftContract, tokenId) {
    try {
      const listing = await this.publicClient.readContract({
        address: MORPH_NFT_MARKETPLACE_ADDRESS,
        abi: MORPH_NFT_MARKETPLACE_ABI,
        functionName: 'getNFTListing',
        args: [nftContract, tokenId]
      })
      return listing
    } catch (error) {
      console.error('Error getting NFT listing:', error)
      return null
    }
  }
}

export default MorphNFTService