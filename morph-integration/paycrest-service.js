import axios from 'axios'

class PaycrestService {
  constructor() {
    this.baseURL = 'https://api.paycrest.co/v1'
    this.apiKey = process.env.NEXT_PUBLIC_PAYCREST_API_KEY
  }

  // Sender API Initialization
  async initializeSender(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/sender/initialize`, {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone: userData.phone
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Paycrest Sender Initialization Error:', error)
      throw error
    }
  }

  // Create Payout Transaction
  async createPayoutTransaction(senderData) {
    try {
      const response = await axios.post(`${this.baseURL}/sender/payout`, {
        sender_id: senderData.senderId,
        amount: senderData.amount,
        currency: 'USD', // Convert to Naira
        recipient_type: 'bank_account',
        recipient_details: {
          bank_code: senderData.bankCode,
          account_number: senderData.accountNumber,
          account_name: senderData.accountName
        },
        metadata: {
          nft_sale_id: senderData.nftSaleId,
          blockchain_transaction: senderData.blockchainTx
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Paycrest Payout Transaction Error:', error)
      throw error
    }
  }

  // Get Payout Transaction Status
  async getPayoutStatus(transactionId) {
    try {
      const response = await axios.get(`${this.baseURL}/sender/payout/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return response.data
    } catch (error) {
      console.error('Paycrest Payout Status Error:', error)
      throw error
    }
  }

  // List Nigerian Banks
  async getNigerianBanks() {
    try {
      const response = await axios.get(`${this.baseURL}/banks/ng`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return response.data
    } catch (error) {
      console.error('Paycrest Nigerian Banks Error:', error)
      throw error
    }
  }
}

export default PaycrestService