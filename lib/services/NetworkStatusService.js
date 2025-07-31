/**
 * Network Status Service
 * Helps diagnose network issues and optimize transaction parameters
 */

import { ethers } from 'ethers';

class NetworkStatusService {
  constructor(rpcUrl = 'https://rpc-holesky.morphl2.io') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = 2810; // Morph Holesky
  }

  /**
   * Get comprehensive network status
   */
  async getNetworkStatus() {
    try {
      const startTime = Date.now();
      
      // Parallel network calls for speed
      const [blockNumber, feeData, balance] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getBalance('0x0000000000000000000000000000000000000000') // Just to test connectivity
      ]);
      
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: true,
        blockNumber,
        gasPrice: feeData.gasPrice,
        gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
        responseTime,
        status: this.getNetworkStatusLevel(responseTime),
        recommendations: this.getRecommendations(responseTime, feeData.gasPrice)
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        status: 'error',
        recommendations: ['Check internet connection', 'Try different RPC endpoint', 'Wait and retry']
      };
    }
  }

  /**
   * Get network status level based on response time
   */
  getNetworkStatusLevel(responseTime) {
    if (responseTime < 1000) return 'excellent';
    if (responseTime < 3000) return 'good';
    if (responseTime < 5000) return 'fair';
    return 'poor';
  }

  /**
   * Get recommendations based on network conditions
   */
  getRecommendations(responseTime, gasPrice) {
    const recommendations = [];
    
    if (responseTime > 5000) {
      recommendations.push('Network is slow - consider waiting for better conditions');
      recommendations.push('Increase transaction timeout');
    }
    
    if (gasPrice && gasPrice > ethers.parseUnits('5', 'gwei')) {
      recommendations.push('Gas prices are high - consider waiting or increasing gas limit');
    }
    
    if (responseTime < 2000 && gasPrice && gasPrice < ethers.parseUnits('2', 'gwei')) {
      recommendations.push('Optimal conditions for transactions');
    }
    
    return recommendations.length > 0 ? recommendations : ['Network conditions are normal'];
  }

  /**
   * Get optimal gas parameters
   */
  async getOptimalGasParams() {
    try {
      const feeData = await this.provider.getFeeData();
      
      return {
        gasPrice: feeData.gasPrice ? feeData.gasPrice * 110n / 100n : ethers.parseUnits('2', 'gwei'),
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      };
    } catch (error) {
      // Fallback values
      return {
        gasPrice: ethers.parseUnits('2', 'gwei'),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }

  /**
   * Test transaction speed
   */
  async testTransactionSpeed() {
    try {
      const startTime = Date.now();
      
      // Test with a simple balance check (no actual transaction)
      await this.provider.getBalance('0x0000000000000000000000000000000000000001');
      
      const responseTime = Date.now() - startTime;
      
      return {
        responseTime,
        speed: responseTime < 1000 ? 'fast' : responseTime < 3000 ? 'medium' : 'slow',
        recommendation: responseTime < 1000 ? 
          'Good time to transact' : 
          responseTime < 3000 ? 
            'Moderate network speed' : 
            'Consider waiting for better network conditions'
      };
    } catch (error) {
      return {
        responseTime: null,
        speed: 'error',
        recommendation: 'Network connectivity issues detected'
      };
    }
  }

  /**
   * Monitor network for optimal transaction timing
   */
  async waitForOptimalConditions(maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getNetworkStatus();
      
      if (status.isHealthy && status.responseTime < 3000) {
        return {
          ready: true,
          status,
          waitTime: Date.now() - startTime
        };
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return {
      ready: false,
      message: 'Timeout waiting for optimal network conditions',
      waitTime: maxWaitTime
    };
  }
}

export default NetworkStatusService;