/**
 * Meno Marketplace Service
 * Handles interaction with the deployed MenoMarketplace contract
 */

import { ethers } from 'ethers';
import { getCurrentNetwork, getContractAddress } from '../network-config';

// ABI for MenoMarketplace contract (essential functions only)
const MENO_MARKETPLACE_ABI = [
  "function listNFT(address nftContract, uint256 tokenId, uint256 price, uint256 duration, bool enableFiatOffRamp) returns (bytes32)",
  "function buyNFT(bytes32 listingId) payable",
  "function updatePrice(bytes32 listingId, uint256 newPrice)",
  "function cancelListing(bytes32 listingId)",
  "function getListing(bytes32 listingId) view returns (tuple(bytes32 listingId, address seller, address nftContract, uint256 tokenId, uint256 price, uint256 createdAt, uint256 expiresAt, bool isActive, bool fiatEnabled, address externalMarketplace, bytes32 externalListingId))",
  "function isListingActive(bytes32 listingId) view returns (bool)",
  "function platformFee() view returns (uint256)",
  "function getCurrentListingId() view returns (uint256)",
  "event NFTListed(bytes32 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, uint256 expiresAt, bool fiatEnabled)",
  "event NFTSold(bytes32 indexed listingId, address indexed buyer, address indexed seller, address nftContract, uint256 tokenId, uint256 price, uint256 platformFeeAmount)",
  "event PriceUpdated(bytes32 indexed listingId, uint256 oldPrice, uint256 newPrice)",
  "event ListingCancelled(bytes32 indexed listingId, address indexed seller)"
];

class MenoMarketplaceService {
  constructor() {
    this.network = getCurrentNetwork();
    this.contractAddress = getContractAddress('menoMarketplace');
    this.contract = null;
    this.provider = null;
    this.signer = null;
    
    console.log('MenoMarketplaceService initialized:');
    console.log('Network:', this.network.name);
    console.log('Contract address:', this.contractAddress);
  }

  /**
   * Initialize the service with a provider and signer
   */
  async initialize(provider, signer = null) {
    if (!this.contractAddress) {
      throw new Error('Marketplace contract address not configured for current network');
    }

    this.provider = provider;
    this.signer = signer;
    
    // Create contract instance
    this.contract = new ethers.Contract(
      this.contractAddress,
      MENO_MARKETPLACE_ABI,
      signer || provider
    );

    console.log('MenoMarketplaceService initialized with contract:', this.contract.target);
    return this;
  }

  /**
   * List an NFT for sale
   */
  async listNFT(nftContract, tokenId, priceInEth, durationInDays, enableFiatOffRamp = true, callbacks = {}) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    try {
      const price = ethers.parseEther(priceInEth.toString());
      const duration = durationInDays * 24 * 60 * 60; // Convert days to seconds

      console.log('🚀 Starting NFT listing process...');
      console.log('Listing parameters:', {
        nftContract,
        tokenId,
        price: price.toString(),
        duration,
        enableFiatOffRamp
      });

      // Optimized gas estimation with fallback
      let gasLimit = 300000n; // Reduced default gas limit
      try {
        console.log('⛽ Estimating gas...');
        const gasEstimate = await this.contract.listNFT.estimateGas(
          nftContract,
          tokenId,
          price,
          duration,
          enableFiatOffRamp
        );
        gasLimit = gasEstimate * 120n / 100n; // Reduced buffer to 20%
        console.log(`✅ Gas estimated: ${gasEstimate.toString()}, using: ${gasLimit.toString()}`);
      } catch (gasError) {
        console.warn('⚠️ Gas estimation failed, using optimized default:', gasError.message);
        // Try with a more conservative approach
        gasLimit = 250000n;
      }

      // Get current gas price for optimization
      const feeData = await this.provider.getFeeData();
      console.log('💰 Current gas price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'gwei');

      // Execute transaction with optimized parameters
      console.log('📝 Sending transaction...');
      const txParams = {
        gasLimit: gasLimit,
        // Use slightly higher gas price for faster confirmation
        gasPrice: feeData.gasPrice ? feeData.gasPrice * 110n / 100n : undefined
      };

      const tx = await this.contract.listNFT(
        nftContract,
        tokenId,
        price,
        duration,
        enableFiatOffRamp,
        txParams
      );

      console.log('✅ Transaction sent:', tx.hash);
      
      // Notify about transaction hash
      if (callbacks.onTransactionSent) {
        callbacks.onTransactionSent(tx.hash);
      }
      
      // Optimized confirmation with immediate success on transaction send
      console.log('⏳ Waiting for confirmation...');
      
      // For better UX, we can return success immediately after transaction is sent
      // and handle confirmation in the background
      const confirmationPromise = tx.wait(1).catch(error => {
        console.warn('Background confirmation failed:', error.message);
        return null;
      });
      
      // Wait for confirmation with shorter timeout for better UX
      let receipt;
      try {
        receipt = await Promise.race([
          confirmationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initial confirmation timeout - transaction may still be processing')), 30000) // 30 seconds
          )
        ]);
      } catch (timeoutError) {
        // Transaction was sent successfully, just confirmation is slow
        console.warn('⚠️ Confirmation timeout, but transaction was sent successfully');
        
        // Return success with transaction hash - user can check status manually
        return {
          success: true,
          transactionHash: tx.hash,
          listingId: null, // Will be available once confirmed
          receipt: null,
          pending: true,
          message: 'Transaction sent successfully. Confirmation may take a few minutes due to network congestion.'
        };
      }
      
      console.log('🎉 Transaction confirmed!', {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      });
      
      // Check transaction status
      if (receipt.status === 0) {
        throw new Error('Transaction failed on blockchain. Please check the transaction details.');
      }

      // Extract listing ID from events
      let listingId = null;
      try {
        const listingEvent = receipt.logs.find(log => {
          try {
            const parsed = this.contract.interface.parseLog(log);
            return parsed.name === 'NFTListed';
          } catch {
            return false;
          }
        });

        if (listingEvent) {
          const parsed = this.contract.interface.parseLog(listingEvent);
          listingId = parsed.args.listingId;
          console.log('📋 Listing ID extracted:', listingId);
        }
      } catch (eventError) {
        console.warn('⚠️ Could not extract listing ID from events:', eventError.message);
      }

      return {
        success: true,
        transactionHash: tx.hash,
        listingId,
        receipt
      };

    } catch (error) {
      console.error('❌ Error listing NFT:', error);
      
      // Provide more specific error messages
      if (error.message.includes('user rejected')) {
        throw new Error('Transaction was rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction');
      } else if (error.message.includes('timeout')) {
        throw new Error('Transaction timed out. Please check the blockchain explorer.');
      } else {
        throw new Error(`Listing failed: ${error.message}`);
      }
    }
  }

  /**
   * Get listing details
   */
  async getListing(listingId) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const listing = await this.contract.getListing(listingId);
      const isActive = await this.contract.isListingActive(listingId);

      return {
        listingId: listing.listingId,
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: ethers.formatEther(listing.price),
        createdAt: new Date(Number(listing.createdAt) * 1000),
        expiresAt: new Date(Number(listing.expiresAt) * 1000),
        isActive: isActive,
        fiatEnabled: listing.fiatEnabled,
        externalMarketplace: listing.externalMarketplace,
        externalListingId: listing.externalListingId
      };
    } catch (error) {
      console.error('Error getting listing:', error);
      throw error;
    }
  }

  /**
   * Update listing price
   */
  async updatePrice(listingId, newPriceInEth) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    try {
      const newPrice = ethers.parseEther(newPriceInEth.toString());
      
      const tx = await this.contract.updatePrice(listingId, newPrice);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Error updating price:', error);
      throw error;
    }
  }

  /**
   * Cancel listing
   */
  async cancelListing(listingId) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    try {
      const tx = await this.contract.cancelListing(listingId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw error;
    }
  }

  /**
   * Buy NFT
   */
  async buyNFT(listingId, priceInEth) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    try {
      const price = ethers.parseEther(priceInEth.toString());
      
      const tx = await this.contract.buyNFT(listingId, {
        value: price
      });
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Error buying NFT:', error);
      throw error;
    }
  }

  /**
   * Get platform fee
   */
  async getPlatformFee() {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const fee = await this.contract.platformFee();
      return {
        basisPoints: Number(fee),
        percentage: Number(fee) / 100
      };
    } catch (error) {
      console.error('Error getting platform fee:', error);
      throw error;
    }
  }

  /**
   * Listen to marketplace events
   */
  setupEventListeners(callbacks = {}) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    // Listen to NFT Listed events
    if (callbacks.onNFTListed) {
      this.contract.on('NFTListed', (listingId, seller, nftContract, tokenId, price, expiresAt, fiatEnabled, event) => {
        callbacks.onNFTListed({
          listingId,
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          price: ethers.formatEther(price),
          expiresAt: new Date(Number(expiresAt) * 1000),
          fiatEnabled,
          event
        });
      });
    }

    // Listen to NFT Sold events
    if (callbacks.onNFTSold) {
      this.contract.on('NFTSold', (listingId, buyer, seller, nftContract, tokenId, price, platformFeeAmount, event) => {
        callbacks.onNFTSold({
          listingId,
          buyer,
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          price: ethers.formatEther(price),
          platformFeeAmount: ethers.formatEther(platformFeeAmount),
          event
        });
      });
    }

    // Listen to Price Updated events
    if (callbacks.onPriceUpdated) {
      this.contract.on('PriceUpdated', (listingId, oldPrice, newPrice, event) => {
        callbacks.onPriceUpdated({
          listingId,
          oldPrice: ethers.formatEther(oldPrice),
          newPrice: ethers.formatEther(newPrice),
          event
        });
      });
    }

    // Listen to Listing Cancelled events
    if (callbacks.onListingCancelled) {
      this.contract.on('ListingCancelled', (listingId, seller, event) => {
        callbacks.onListingCancelled({
          listingId,
          seller,
          event
        });
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

export default MenoMarketplaceService;