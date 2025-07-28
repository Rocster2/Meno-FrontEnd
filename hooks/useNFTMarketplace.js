import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import MorphNFTService from '@/morph-integration/morph-nft-service'
import RubicBridgeService from '@/morph-integration/rubic-bridge-service'
import PaycrestService from '@/morph-integration/paycrest-service'

export function useNFTMarketplace() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [morphNFTService, setMorphNFTService] = useState(null)
  const [rubicBridgeService, setRubicBridgeService] = useState(null)
  const [paycrestService, setPaycrestService] = useState(null)

  const [userNFTs, setUserNFTs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isConnected && walletClient) {
      const morphService = new MorphNFTService(walletClient)
      const rubicService = new RubicBridgeService(walletClient)
      const paycrestService = new PaycrestService()

      setMorphNFTService(morphService)
      setRubicBridgeService(rubicService)
      setPaycrestService(paycrestService)
    }
  }, [isConnected, walletClient])

  // Fetch User's NFTs
  const fetchUserNFTs = async () => {
    if (!morphNFTService || !address) return

    setIsLoading(true)
    try {
      const nfts = await morphNFTService.fetchUserNFTs(address)
      setUserNFTs(nfts)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }

  // List NFT for Sale
  const listNFTForSale = async (nftContract, tokenId, price) => {
    if (!morphNFTService) {
      throw new Error('NFT Service not initialized')
    }

    setIsLoading(true)
    try {
      const hash = await morphNFTService.listNFTForSale(nftContract, tokenId, price)
      return hash
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Buy NFT
  const buyNFT = async (nftContract, tokenId, price) => {
    if (!morphNFTService) {
      throw new Error('NFT Service not initialized')
    }

    setIsLoading(true)
    try {
      const hash = await morphNFTService.buyNFT(nftContract, tokenId, price)
      return hash
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Bridge Token to USDC
  const bridgeToUSDC = async (amount, fromAddress, toAddress) => {
    if (!rubicBridgeService) {
      throw new Error('Rubic Bridge Service not initialized')
    }

    setIsLoading(true)
    try {
      const bridgeResult = await rubicBridgeService.bridgeToUSDC(amount, fromAddress, toAddress)
      return bridgeResult
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Create Paycrest Payout
  const createPaycrestPayout = async (payoutDetails) => {
    if (!paycrestService) {
      throw new Error('Paycrest Service not initialized')
    }

    setIsLoading(true)
    try {
      const payoutResult = await paycrestService.createPayoutTransaction(payoutDetails)
      return payoutResult
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Full NFT Sale Workflow
  const executeNFTSaleWorkflow = async (nftDetails, salePrice) => {
    try {
      // 1. List NFT on Morph Marketplace
      const saleHash = await listNFTForSale(
        nftDetails.contractAddress, 
        nftDetails.tokenId, 
        salePrice
      )

      // 2. Wait for sale confirmation (might need additional handling)
      const saleConfirmation = await morphNFTService.waitForTransaction(saleHash)

      // 3. Bridge sale proceeds to Ethereum
      const bridgeResult = await bridgeToUSDC(
        saleConfirmation.amount, 
        address, 
        address
      )

      // 4. Create Paycrest Payout
      const payoutResult = await createPaycrestPayout({
        senderId: address,
        amount: bridgeResult.amount,
        bankCode: 'SELECTED_BANK_CODE',
        accountNumber: 'USER_ACCOUNT_NUMBER',
        accountName: 'USER_ACCOUNT_NAME',
        nftSaleId: nftDetails.tokenId,
        blockchainTx: bridgeResult.transactionHash
      })

      return {
        sale: saleConfirmation,
        bridge: bridgeResult,
        payout: payoutResult
      }
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return {
    userNFTs,
    isLoading,
    error,
    fetchUserNFTs,
    listNFTForSale,
    buyNFT,
    bridgeToUSDC,
    createPaycrestPayout,
    executeNFTSaleWorkflow
  }
}