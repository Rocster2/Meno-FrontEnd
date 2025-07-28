/**
 * Demo NFT Service for Hackathon Demonstration
 * Handles interaction with the deployed HackathonDemoNFT contract
 */

import { ethers } from 'ethers';
import { getCurrentNetwork } from '../network-config';

// ABI for HackathonDemoNFT contract
const HACKATHON_DEMO_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function getNextTokenId() view returns (uint256)",
  "function mintWithURI(address to, string tokenURI) returns (uint256)",
  "function mintToSelf(string tokenURI) returns (uint256)",
  "event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

class DemoNFTService {
  constructor() {
    this.contractAddress = process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS;
    this.network = getCurrentNetwork();
    this.contract = null;
    this.provider = null;
    
    console.log('DemoNFTService constructor:');
    console.log('Contract address:', this.contractAddress);
    console.log('Network:', this.network);
  }

  /**
   * Initialize the service with a provider
   */
  async initialize(wagmiClient) {
    if (!this.contractAddress) {
      throw new Error('Demo NFT contract address not configured');
    }

    console.log('Initializing with wagmi client:', wagmiClient);

    // Create ethers provider from wagmi client
    try {
      // Use the RPC URL directly to create an ethers provider
      const rpcUrl = this.network.rpcUrls.default.http[0];
      console.log('Using RPC URL:', rpcUrl);
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      this.contract = new ethers.Contract(
        this.contractAddress,
        HACKATHON_DEMO_NFT_ABI,
        this.provider
      );

      console.log('Contract initialized:', this.contract.target);
      return this;
    } catch (error) {
      console.error('Error initializing provider:', error);
      throw error;
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo() {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.contract.name(),
        this.contract.symbol(),
        this.contract.totalSupply()
      ]);

      return {
        address: this.contractAddress,
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        network: this.network.name,
        explorerUrl: `${this.network.blockExplorers.default.url}/address/${this.contractAddress}`
      };
    } catch (error) {
      console.error('Error getting contract info:', error);
      throw error;
    }
  }

  /**
   * Get NFTs owned by a specific address
   * Since our contract doesn't implement ERC721Enumerable, we'll check specific token IDs
   */
  async getNFTsOwnedBy(ownerAddress) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const totalSupply = await this.contract.totalSupply();
      const totalSupplyNum = parseInt(totalSupply.toString());
      
      if (totalSupplyNum === 0) {
        return [];
      }

      const nfts = [];
      
      // Check each token ID to see if the address owns it
      for (let tokenId = 0; tokenId < totalSupplyNum; tokenId++) {
        try {
          const owner = await this.contract.ownerOf(tokenId);
          
          if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
            const tokenURI = await this.contract.tokenURI(tokenId);
            
            nfts.push({
              tokenId: tokenId.toString(),
              tokenURI,
              owner: ownerAddress,
              contractAddress: this.contractAddress,
              contractName: await this.contract.name(),
              contractSymbol: await this.contract.symbol()
            });
          }
        } catch (error) {
          console.warn(`Error checking token ${tokenId}:`, error);
          // Continue with other tokens
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error getting NFTs owned by address:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific NFT
   */
  async getNFTMetadata(tokenId) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const [tokenURI, owner] = await Promise.all([
        this.contract.tokenURI(tokenId),
        this.contract.ownerOf(tokenId)
      ]);

      // Fetch metadata from IPFS
      let metadata = null;
      if (tokenURI.startsWith('ipfs://') || tokenURI.startsWith('https://ipfs.io/ipfs/')) {
        try {
          // Clean up the IPFS URL (remove duplicate ipfs:// if present)
          let cleanTokenURI = tokenURI;
          
          // Handle the specific case from our contract where tokenURI has https://ipfs.io/ipfs/ipfs://
          if (cleanTokenURI.startsWith('https://ipfs.io/ipfs/ipfs://')) {
            cleanTokenURI = cleanTokenURI.replace('https://ipfs.io/ipfs/ipfs://', 'ipfs://');
          }
          // Handle various malformed IPFS URLs
          if (cleanTokenURI.includes('https://ipfs.io/ipfs/ipfs://')) {
            cleanTokenURI = cleanTokenURI.replace('https://ipfs.io/ipfs/ipfs://', 'ipfs://');
          }
          if (cleanTokenURI.includes('ipfs://ipfs://')) {
            cleanTokenURI = cleanTokenURI.replace('ipfs://ipfs://', 'ipfs://');
          }
          
          const ipfsUrl = cleanTokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
          console.log('Original tokenURI:', tokenURI);
          console.log('Cleaned tokenURI:', cleanTokenURI);
          console.log('Fetching metadata from:', ipfsUrl);
          
          const response = await fetch(ipfsUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          metadata = await response.json();
          console.log('Metadata fetched:', metadata);
        } catch (error) {
          console.warn('Error fetching metadata from IPFS:', error);
          // Fallback to known metadata if IPFS fails
          metadata = {
            name: 'My Morph NFT',
            description: 'First NFT on Morph Testnet!',
            image: 'ipfs://bafybeific6exbtk6gm5wqtgqms4bcbncqqywcad7oiugwblgaah3wfivvi',
            attributes: [{"trait_type": "Rarity", "value": "Legendary"}]
          };
          console.log('Using fallback metadata:', metadata);
        }
      }

      return {
        tokenId: tokenId.toString(),
        tokenURI,
        owner,
        metadata,
        contractAddress: this.contractAddress,
        explorerUrl: `${this.network.blockExplorers.default.url}/token/${this.contractAddress}?a=${tokenId}`
      };
    } catch (error) {
      console.error('Error getting NFT metadata:', error);
      throw error;
    }
  }

  /**
   * Check if the demo NFT exists and get its details
   */
  async getDemoNFTDetails() {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      console.log('Getting total supply...');
      const totalSupply = await this.contract.totalSupply();
      console.log('Total supply:', totalSupply.toString());
      
      if (totalSupply.toString() === '0') {
        console.log('No NFTs minted yet');
        return null; // No NFTs minted yet
      }

      // Get the first NFT (token ID 0) which should be our demo NFT
      console.log('Getting NFT metadata for token 0...');
      const demoNFT = await this.getNFTMetadata(0);
      console.log('Demo NFT data:', demoNFT);
      
      return {
        ...demoNFT,
        isDemoNFT: true,
        mintTransactionUrl: `${this.network.blockExplorers.default.url}/tx/0x64187b7fe5a4653c33bf87c07df57d641a356d29090456c5925a054e16c1f635`
      };
    } catch (error) {
      console.error('Error getting demo NFT details:', error);
      // Don't return null, try to return basic info even if metadata fails
      try {
        const owner = await this.contract.ownerOf(0);
        const tokenURI = await this.contract.tokenURI(0);
        
        return {
          tokenId: '0',
          tokenURI,
          owner,
          metadata: {
            name: 'My Morph NFT',
            description: 'First NFT on Morph Testnet!',
            image: 'ipfs://bafybeific6exbtk6gm5wqtgqms4bcbncqqywcad7oiugwblgaah3wfivvi'
          },
          contractAddress: this.contractAddress,
          isDemoNFT: true,
          explorerUrl: `${this.network.blockExplorers.default.url}/token/${this.contractAddress}?a=0`
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Format NFT data for display in the UI
   */
  formatNFTForDisplay(nft) {
    const metadata = nft.metadata || {};
    
    return {
      id: `${nft.contractAddress}-${nft.tokenId}`,
      tokenId: nft.tokenId,
      contractAddress: nft.contractAddress,
      name: metadata.name || `${nft.contractName} #${nft.tokenId}`,
      description: metadata.description || 'Demo NFT for Morph Hackathon',
      image: metadata.image ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null,
      attributes: metadata.attributes || [],
      owner: nft.owner,
      tokenURI: nft.tokenURI,
      collection: {
        name: nft.contractName,
        symbol: nft.contractSymbol,
        address: nft.contractAddress
      },
      network: this.network.name,
      explorerUrl: nft.explorerUrl,
      isDemoNFT: nft.isDemoNFT || false
    };
  }

  /**
   * Get all demo NFTs for display
   */
  async getAllDemoNFTs() {
    try {
      console.log('Getting contract info...');
      const contractInfo = await this.getContractInfo();
      console.log('Contract info:', contractInfo);
      
      console.log('Getting demo NFT details...');
      const demoNFT = await this.getDemoNFTDetails();
      console.log('Demo NFT:', demoNFT);
      
      if (!demoNFT) {
        console.log('No demo NFT found');
        return {
          contractInfo,
          nfts: []
        };
      }

      const formattedNFT = this.formatNFTForDisplay(demoNFT);
      console.log('Formatted NFT:', formattedNFT);

      return {
        contractInfo,
        nfts: [formattedNFT]
      };
    } catch (error) {
      console.error('Error getting all demo NFTs:', error);
      throw error; // Re-throw to see the error in the component
    }
  }
}

export default DemoNFTService;