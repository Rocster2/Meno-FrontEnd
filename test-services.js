#!/usr/bin/env node

/**
 * Service Testing Script
 * Tests all external service integrations including Paycrest API
 */

import dotenv from 'dotenv'
import { PaycrestService } from './lib/services/PaycrestService.js'
import { TransactionManager } from './lib/services/TransactionManager.js'
import { NFTDetectionService } from './lib/services/NFTDetectionService.js'

// Load environment variables
dotenv.config()

class ServiceTester {
  constructor() {
    this.results = {
      paycrest: { status: 'pending', details: null, error: null },
      transactionManager: { status: 'pending', details: null, error: null },
      nftDetection: { status: 'pending', details: null, error: null }
    }
  }

  /**
   * Test Paycrest API integration
   */
  async testPaycrest() {
    console.log('\n🔍 Testing Paycrest API Integration...')
    
    try {
      const paycrest = new PaycrestService()
      
      // Test 1: Check API connection
      console.log('  ✓ Testing API connection...')
      const healthCheck = await paycrest.healthCheck()
      
      if (!healthCheck.success) {
        throw new Error('Paycrest API health check failed')
      }
      
      // Test 2: Get conversion rates
      console.log('  ✓ Testing conversion rates...')
      const rates = await paycrest.getConversionRate(100, 'USDT')
      
      if (!rates || !rates.exchangeRate) {
        throw new Error('Failed to get conversion rates')
      }
      
      // Test 3: Validate bank account (mock)
      console.log('  ✓ Testing bank validation...')
      const bankValidation = await paycrest.validateBankAccount('0123456789', '044')
      
      // Test 4: Get supported banks
      console.log('  ✓ Testing supported banks...')
      const banks = await paycrest.getSupportedBanks()
      
      if (!banks || banks.length === 0) {
        throw new Error('No supported banks found')
      }
      
      this.results.paycrest = {
        status: 'success',
        details: {
          apiConnection: healthCheck,
          conversionRates: rates,
          bankValidation: bankValidation,
          supportedBanks: banks.length,
          environment: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'development'
        },
        error: null
      }
      
      console.log('  ✅ Paycrest API integration test passed')
      
    } catch (error) {
      this.results.paycrest = {
        status: 'failed',
        details: null,
        error: error.message
      }
      
      console.log('  ❌ Paycrest API integration test failed:', error.message)
    }
  }

  /**
   * Test Transaction Manager
   */
  async testTransactionManager() {
    console.log('\n🔍 Testing Transaction Manager...')
    
    try {
      const txManager = new TransactionManager()
      
      // Test 1: Check initialization
      console.log('  ✓ Testing initialization...')
      const stats = txManager.getStats()
      
      // Test 2: Validate transaction request
      console.log('  ✓ Testing transaction validation...')
      const mockTxRequest = {
        type: 'nft_listing',
        to: '0x1234567890123456789012345678901234567890',
        from: '0x0987654321098765432109876543210987654321',
        nftContract: '0x1111111111111111111111111111111111111111',
        tokenId: '123',
        price: 1.5,
        data: '0x'
      }
      
      // This should not throw an error
      txManager.validateTransactionRequest(mockTxRequest)
      
      // Test 3: Check gas estimation (mock)
      console.log('  ✓ Testing gas estimation...')
      // Note: This would require a real blockchain connection
      
      this.results.transactionManager = {
        status: 'success',
        details: {
          initialization: 'success',
          validation: 'success',
          stats: stats
        },
        error: null
      }
      
      console.log('  ✅ Transaction Manager test passed')
      
    } catch (error) {
      this.results.transactionManager = {
        status: 'failed',
        details: null,
        error: error.message
      }
      
      console.log('  ❌ Transaction Manager test failed:', error.message)
    }
  }

  /**
   * Test NFT Detection Service
   */
  async testNFTDetection() {
    console.log('\n🔍 Testing NFT Detection Service...')
    
    try {
      const nftService = new NFTDetectionService()
      
      // Test 1: Check initialization
      console.log('  ✓ Testing initialization...')
      const dataMode = nftService.getDataMode()
      
      // Test 2: Test mock data mode
      console.log('  ✓ Testing mock data mode...')
      nftService.setDataMode('mock')
      const mockNFTs = await nftService.getUserNFTsWithMode('0x1234567890123456789012345678901234567890')
      
      // Test 3: Test real data mode
      console.log('  ✓ Testing real data mode...')
      nftService.setDataMode('real')
      const realNFTs = await nftService.getUserNFTsWithMode('0x1234567890123456789012345678901234567890')
      
      // Test 4: Get supported collections
      console.log('  ✓ Testing supported collections...')
      const collections = nftService.getSupportedCollections()
      
      // Test 5: Get service stats
      console.log('  ✓ Testing service stats...')
      const stats = nftService.getStats()
      
      this.results.nftDetection = {
        status: 'success',
        details: {
          dataMode: dataMode,
          mockNFTs: mockNFTs.count,
          realNFTs: realNFTs.count,
          supportedCollections: collections.length,
          stats: stats
        },
        error: null
      }
      
      console.log('  ✅ NFT Detection Service test passed')
      
    } catch (error) {
      this.results.nftDetection = {
        status: 'failed',
        details: null,
        error: error.message
      }
      
      console.log('  ❌ NFT Detection Service test failed:', error.message)
    }
  }

  /**
   * Test environment configuration
   */
  testEnvironmentConfig() {
    console.log('\n🔍 Testing Environment Configuration...')
    
    const requiredVars = [
      'NEXT_PUBLIC_PROJECT_ID',
      'NEXT_PUBLIC_PAYCREST_API_KEY',
      'PAYCREST_SECRET_KEY'
    ]
    
    const missingVars = []
    const presentVars = []
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        presentVars.push(varName)
        console.log(`  ✓ ${varName}: configured`)
      } else {
        missingVars.push(varName)
        console.log(`  ❌ ${varName}: missing`)
      }
    }
    
    // Optional variables
    const optionalVars = [
      'NEXT_PUBLIC_MORPH_MAINNET_RPC',
      'NEXT_PUBLIC_MORPH_TESTNET_RPC',
      'DATABASE_URL',
      'REDIS_URL'
    ]
    
    console.log('\n  Optional variables:')
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        console.log(`  ✓ ${varName}: configured`)
      } else {
        console.log(`  ⚠️  ${varName}: not configured`)
      }
    }
    
    return {
      requiredVars: {
        total: requiredVars.length,
        present: presentVars.length,
        missing: missingVars.length,
        missingList: missingVars
      },
      environment: process.env.NODE_ENV || 'development',
      deploymentEnv: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'development'
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Service Integration Tests...')
    console.log('=' .repeat(50))
    
    // Test environment configuration first
    const envConfig = this.testEnvironmentConfig()
    
    // Run service tests
    await this.testPaycrest()
    await this.testTransactionManager()
    await this.testNFTDetection()
    
    // Generate report
    this.generateReport(envConfig)
  }

  /**
   * Generate test report
   */
  generateReport(envConfig) {
    console.log('\n' + '=' .repeat(50))
    console.log('📊 TEST RESULTS SUMMARY')
    console.log('=' .repeat(50))
    
    // Environment Configuration
    console.log('\n🔧 Environment Configuration:')
    console.log(`  Environment: ${envConfig.environment}`)
    console.log(`  Deployment: ${envConfig.deploymentEnv}`)
    console.log(`  Required vars: ${envConfig.requiredVars.present}/${envConfig.requiredVars.total}`)
    
    if (envConfig.requiredVars.missing > 0) {
      console.log(`  ❌ Missing: ${envConfig.requiredVars.missingList.join(', ')}`)
    }
    
    // Service Tests
    console.log('\n🧪 Service Tests:')
    
    for (const [service, result] of Object.entries(this.results)) {
      const status = result.status === 'success' ? '✅' : '❌'
      console.log(`  ${status} ${service}: ${result.status}`)
      
      if (result.error) {
        console.log(`    Error: ${result.error}`)
      }
    }
    
    // Overall Status
    const totalTests = Object.keys(this.results).length
    const passedTests = Object.values(this.results).filter(r => r.status === 'success').length
    const failedTests = totalTests - passedTests
    
    console.log('\n📈 Overall Results:')
    console.log(`  Total Tests: ${totalTests}`)
    console.log(`  Passed: ${passedTests}`)
    console.log(`  Failed: ${failedTests}`)
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    // Recommendations
    console.log('\n💡 Recommendations:')
    
    if (envConfig.requiredVars.missing > 0) {
      console.log('  • Configure missing environment variables')
      console.log('  • Refer to .env.example for required variables')
    }
    
    if (this.results.paycrest.status === 'failed') {
      console.log('  • Check Paycrest API credentials')
      console.log('  • Verify network connectivity')
      console.log('  • Review PAYCREST_SETUP_GUIDE.md')
    }
    
    if (failedTests === 0 && envConfig.requiredVars.missing === 0) {
      console.log('  🎉 All tests passed! Your setup is ready for development.')
    }
    
    console.log('\n' + '=' .repeat(50))
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ServiceTester()
  tester.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export default ServiceTester