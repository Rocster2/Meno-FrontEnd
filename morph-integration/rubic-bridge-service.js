import { createPublicClient, createWalletClient, http } from 'viem'
import { morphMainnet, mainnet } from '@/lib/web3-config'
import { 
  SDK, 
  CHAIN_TYPE, 
  Configuration 
} from 'rubic-sdk'

class RubicBridgeService {
  constructor(walletClient) {
    this.walletClient = walletClient
    this.publicClient = createPublicClient({
      chain: morphMainnet,
      transport: http()
    })
    this.rubicSDK = null
  }

  // Initialize Rubic SDK with actual implementation
  async initializeRubicSDK() {
    try {
      const configuration = {
        rpcProviders: {
          [CHAIN_TYPE.EVM]: {
            rpcList: {
              [morphMainnet.id]: {
                rpcList: ['https://rpc-quicknode.morphl2.io']
              },
              [mainnet.id]: {
                rpcList: ['https://eth-mainnet.g.alchemy.com/v2/your-api-key']
              }
            }
          }
        },
        // No API key needed for basic functionality
        providerAddress: {
          [CHAIN_TYPE.EVM]: {
            crossChain: await this.walletClient.getAddresses().then(addresses => addresses[0]),
            onChain: await this.walletClient.getAddresses().then(addresses => addresses[0])
          }
        }
      }

      this.rubicSDK = await SDK.createSDK(configuration)
    } catch (error) {
      console.error('Error initializing Rubic SDK:', error)
      throw error
    }
  }

  // Get available cross-chain routes
  async getAvailableRoutes(fromTokenAddress, toTokenAddress, amount) {
    try {
      if (!this.rubicSDK) {
        await this.initializeRubicSDK()
      }

      const fromToken = await this.rubicSDK.tokens.findToken({
        address: fromTokenAddress,
        blockchain: morphMainnet.id
      })

      const toToken = await this.rubicSDK.tokens.findToken({
        address: toTokenAddress,
        blockchain: mainnet.id
      })

      const trades = await this.rubicSDK.crossChain.calculateTrade(
        {
          fromToken,
          toToken,
          fromAmount: amount
        },
        {
          gasCalculation: 'enabled',
          slippageTolerance: 0.04 // 4%
        }
      )

      return trades
    } catch (error) {
      console.error('Error getting available routes:', error)
      throw error
    }
  }

  // Bridge token from Morph to Ethereum
  async bridgeToUSDC(amount, fromAddress, toAddress) {
    try {
      if (!this.rubicSDK) {
        await this.initializeRubicSDK()
      }

      // ETH on Morph to USDC on Ethereum
      const fromToken = await this.rubicSDK.tokens.findToken({
        address: '0x0000000000000000000000000000000000000000', // Native ETH
        blockchain: morphMainnet.id
      })

      const toToken = await this.rubicSDK.tokens.findToken({
        address: '0xA0b86a33E6441D1C0113c5DD7f8DD4b5b3F6c7D3', // USDC on Ethereum
        blockchain: mainnet.id
      })

      // Calculate best trade
      const trades = await this.rubicSDK.crossChain.calculateTrade(
        {
          fromToken,
          toToken,
          fromAmount: amount
        },
        {
          gasCalculation: 'enabled',
          slippageTolerance: 0.04,
          deadlineMinutes: 20
        }
      )

      if (trades.length === 0) {
        throw new Error('No cross-chain routes available')
      }

      // Use the best trade (first one is usually optimal)
      const bestTrade = trades[0]

      // Execute the trade
      const receipt = await bestTrade.swap({
        onConfirm: (hash) => {
          console.log('Transaction confirmed:', hash)
        }
      })

      return {
        trade: bestTrade,
        transactionHash: receipt.hash,
        fromAmount: amount,
        toAmount: bestTrade.to.tokenAmount,
        bridgeType: bestTrade.type
      }
    } catch (error) {
      console.error('Error bridging tokens:', error)
      throw error
    }
  }

  // Estimate bridge fees and time
  async estimateBridgeCost(amount, fromTokenAddress = null, toTokenAddress = null) {
    try {
      if (!this.rubicSDK) {
        await this.initializeRubicSDK()
      }

      const fromToken = await this.rubicSDK.tokens.findToken({
        address: fromTokenAddress || '0x0000000000000000000000000000000000000000',
        blockchain: morphMainnet.id
      })

      const toToken = await this.rubicSDK.tokens.findToken({
        address: toTokenAddress || '0xA0b86a33E6441D1C0113c5DD7f8DD4b5b3F6c7D3',
        blockchain: mainnet.id
      })

      const trades = await this.rubicSDK.crossChain.calculateTrade(
        {
          fromToken,
          toToken,
          fromAmount: amount
        },
        {
          gasCalculation: 'enabled'
        }
      )

      if (trades.length === 0) {
        return null
      }

      const bestTrade = trades[0]
      
      return {
        estimatedTime: bestTrade.estimatedTime,
        feeInfo: bestTrade.feeInfo,
        priceImpact: bestTrade.priceImpact,
        minimumReceived: bestTrade.to.tokenAmount,
        networkFee: bestTrade.feeInfo?.rubicProxy?.fixedFee || 0
      }
    } catch (error) {
      console.error('Error estimating bridge cost:', error)
      return null
    }
  }

  // Get supported tokens for bridging
  async getSupportedTokens() {
    try {
      if (!this.rubicSDK) {
        await this.initializeRubicSDK()
      }

      const morphTokens = await this.rubicSDK.tokens.getSupportedTokens({
        blockchain: morphMainnet.id
      })

      const ethereumTokens = await this.rubicSDK.tokens.getSupportedTokens({
        blockchain: mainnet.id
      })

      return {
        morphTokens,
        ethereumTokens
      }
    } catch (error) {
      console.error('Error getting supported tokens:', error)
      return { morphTokens: [], ethereumTokens: [] }
    }
  }
}

export default RubicBridgeService