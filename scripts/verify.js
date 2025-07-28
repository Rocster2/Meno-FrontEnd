const { run, network } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log(`\n🔍 Verifying contracts on ${network.name}...`)
  
  // Load deployment results
  const deploymentFile = path.join(__dirname, '..', 'deployments', `${network.name}.json`)
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment file found for ${network.name}`)
    console.log(`Expected file: ${deploymentFile}`)
    console.log('Please run deployment first: npm run deploy')
    process.exit(1)
  }
  
  const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
  
  try {
    // ===========================================
    // VERIFY MENO MARKETPLACE CONTRACT
    // ===========================================
    if (deployments.menoMarketplace?.address) {
      console.log('\n📋 Verifying MenoMarketplace...')
      
      await run('verify:verify', {
        address: deployments.menoMarketplace.address,
        constructorArguments: [], // MenoMarketplace has no constructor arguments
        contract: 'contracts/MenoMarketplace.sol:MenoMarketplace'
      })
      
      console.log(`✅ MenoMarketplace verified: ${deployments.menoMarketplace.address}`)
    }
    
    // ===========================================
    // VERIFY FIAT OFF-RAMP CONTRACT
    // ===========================================
    if (deployments.fiatOffRamp?.address) {
      console.log('\n📋 Verifying FiatOffRamp...')
      
      await run('verify:verify', {
        address: deployments.fiatOffRamp.address,
        constructorArguments: [], // FiatOffRamp has no constructor arguments
        contract: 'contracts/FiatOffRamp.sol:FiatOffRamp'
      })
      
      console.log(`✅ FiatOffRamp verified: ${deployments.fiatOffRamp.address}`)
    }
    
    // ===========================================
    // VERIFICATION SUMMARY
    // ===========================================
    console.log('\n🎉 Verification Summary')
    console.log('=' .repeat(50))
    console.log(`Network: ${network.name}`)
    console.log(`Chain ID: ${deployments.networkInfo?.chainId}`)
    
    if (deployments.menoMarketplace?.address) {
      const explorerUrl = getExplorerUrl(network.name)
      console.log(`MenoMarketplace: ${explorerUrl}/address/${deployments.menoMarketplace.address}#code`)
    }
    
    if (deployments.fiatOffRamp?.address) {
      const explorerUrl = getExplorerUrl(network.name)
      console.log(`FiatOffRamp: ${explorerUrl}/address/${deployments.fiatOffRamp.address}#code`)
    }
    
    console.log('\n✅ All contracts verified successfully!')
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    
    // Provide helpful error messages
    if (error.message.includes('Already Verified')) {
      console.log('\n💡 Contracts may already be verified. Check the explorer links above.')
    } else if (error.message.includes('API Key')) {
      console.log('\n💡 Make sure you have the correct API key configured in hardhat.config.js')
    } else if (error.message.includes('Constructor arguments')) {
      console.log('\n💡 Constructor arguments mismatch. Check the deployment parameters.')
    }
    
    process.exit(1)
  }
}

function getExplorerUrl(networkName) {
  switch (networkName) {
    case 'morphHolesky':
      return 'https://explorer-holesky.morphl2.io'
    case 'morphMainnet':
      return 'https://explorer.morphl2.io'
    default:
      return 'https://explorer.morphl2.io'
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { main }