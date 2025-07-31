/**
 * NFT Off-ramp Service
 * Handles the complete flow from NFT listing to native token conversion
 * Perfect for hackathon demonstration
 */

import { ethers } from 'ethers';
import MenoMarketplaceService from './MenoMarketplaceService';

class NFTOffRampService {
  constructor() {
    this.marketplaceService = new MenoMarketplaceService();
    this.provider = null;
    this.signer = null;
  }

  /**
   * Initialize the service
   */
  async initialize(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    await this.marketplaceService.initialize(provider, signer);
    return this;
  }

  /**
   * Complete NFT Off-ramp Flow
   * 1. List NFT on marketplace
   * 2. Simulate instant purchase (for demo)
   * 3. Convert ETH to native tokens
   */
  async executeOffRamp(nftContract, tokenId, priceInEth, callbacks = {}) {
    try {
      console.log('🚀 Starting NFT Off-ramp Process...');
      
      // Step 1: List NFT on marketplace
      if (callbacks.onStageChange) {
        callbacks.onStageChange('listing', 'Listing your NFT on the marketplace...');
      }

      const listingResult = await this.marketplaceService.listNFT(
        nftContract,
        tokenId,
        priceInEth,
        1, // 1 day duration
        true, // Enable fiat off-ramp
        {
          onTransactionSent: (hash) => {
            if (callbacks.onTransactionSent) {
              callbacks.onTransactionSent(hash, 'listing');
            }
          }
        }
      );

      console.log('✅ NFT listed successfully:', listingResult);

      // Step 2: Simulate instant purchase for demo
      if (callbacks.onStageChange) {
        callbacks.onStageChange('selling', 'Simulating NFT purchase...');
      }

      // For demo purposes, we'll simulate an instant sale
      const saleResult = await this.simulateInstantSale(listingResult, priceInEth, callbacks);

      // Step 3: Convert to native tokens
      if (callbacks.onStageChange) {
        callbacks.onStageChange('converting', 'Converting ETH to native tokens...');
      }

      const conversionResult = await this.convertToNativeTokens(saleResult, callbacks);

      // Step 4: Complete the off-ramp
      if (callbacks.onStageChange) {
        callbacks.onStageChange('completed', 'Off-ramp completed successfully!');
      }

      return {
        success: true,
        listingResult,
        saleResult,
        conversionResult,
        totalAmount: conversionResult.nativeTokenAmount,
        transactionHashes: [
          listingResult.transactionHash,
          saleResult.transactionHash,
          conversionResult.transactionHash
        ]
      };

    } catch (error) {
      console.error('❌ Off-ramp process failed:', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Simulate instant sale for demo purposes
   */
  async simulateInstantSale(listingResult, priceInEth, callbacks) {
    console.log('🎭 Simulating instant NFT sale...');
    
    // For demo, we'll create a mock sale transaction
    // In production, this would be handled by actual buyers
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    
    const mockSaleHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    if (callbacks.onTransactionSent) {
      callbacks.onTransactionSent(mockSaleHash, 'sale');
    }

    return {
      success: true,
      transactionHash: mockSaleHash,
      buyer: '0x742d35Cc6634C0532925a3b8D4C9db96590c0000', // Mock buyer
      seller: this.signer.address,
      price: ethers.parseEther(priceInEth.toString()),
      platformFee: ethers.parseEther((priceInEth * 0.025).toString()), // 2.5% fee
      sellerAmount: ethers.parseEther((priceInEth * 0.975).toString()),
      soldAt: new Date()
    };
  }

  /**
   * Convert ETH to native tokens (simulated for demo)
   */
  async convertToNativeTokens(saleResult, callbacks) {
    console.log('💱 Converting ETH to native tokens...');
    
    // Simulate conversion process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const ethAmount = ethers.formatEther(saleResult.sellerAmount);
    const conversionRate = 2200; // Mock ETH to USD rate
    const usdAmount = parseFloat(ethAmount) * conversionRate;
    const nativeTokenRate = 1650; // Mock USD to NGN rate (example)
    const nativeTokenAmount = usdAmount * nativeTokenRate;
    
    const mockConversionHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    if (callbacks.onTransactionSent) {
      callbacks.onTransactionSent(mockConversionHash, 'conversion');
    }

    return {
      success: true,
      transactionHash: mockConversionHash,
      ethAmount: parseFloat(ethAmount),
      usdAmount: usdAmount,
      nativeTokenAmount: nativeTokenAmount,
      nativeTokenSymbol: 'NGN', // Nigerian Naira for demo
      conversionRate: conversionRate,
      nativeTokenRate: nativeTokenRate,
      provider: 'Paycrest', // Mock provider
      convertedAt: new Date()
    };
  }

  /**
   * Get off-ramp status for a transaction
   */
  async getOffRampStatus(transactionHash) {
    // Mock status check for demo
    return {
      status: 'completed',
      stage: 'converted',
      message: 'Your NFT has been successfully converted to native tokens',
      estimatedCompletion: new Date(Date.now() + 300000) // 5 minutes from now
    };
  }

  /**
   * Quick demo off-ramp (simplified for presentation)
   */
  async quickDemoOffRamp(nftContract, tokenId, priceInEth) {
    console.log('🎬 Quick Demo Off-ramp Starting...');
    
    const steps = [
      { name: 'Listing NFT', duration: 2000 },
      { name: 'Finding Buyer', duration: 1500 },
      { name: 'Processing Sale', duration: 2000 },
      { name: 'Converting to Native Tokens', duration: 3000 },
      { name: 'Transfer Complete', duration: 1000 }
    ];

    const results = [];
    
    for (const step of steps) {
      console.log(`📋 ${step.name}...`);
      await new Promise(resolve => setTimeout(resolve, step.duration));
      
      results.push({
        step: step.name,
        completed: true,
        timestamp: new Date()
      });
    }

    // Calculate final amounts
    const ethAmount = parseFloat(priceInEth);
    const platformFee = ethAmount * 0.025; // 2.5%
    const netEthAmount = ethAmount - platformFee;
    const usdAmount = netEthAmount * 2200; // Mock conversion rate
    const nativeTokenAmount = usdAmount * 1650; // Mock NGN rate

    return {
      success: true,
      steps: results,
      summary: {
        originalNFT: `Token #${tokenId}`,
        listedPrice: `${ethAmount} ETH`,
        platformFee: `${platformFee.toFixed(4)} ETH`,
        netAmount: `${netEthAmount.toFixed(4)} ETH`,
        usdValue: `$${usdAmount.toFixed(2)}`,
        nativeTokens: `₦${nativeTokenAmount.toLocaleString()}`,
        provider: 'Paycrest',
        completedAt: new Date()
      }
    };
  }
}

export default NFTOffRampService;