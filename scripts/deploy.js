const { ethers, network } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log(`\n🚀 Deploying to ${network.name}...`)
  console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`)
  
  const [deployer] = await ethers.getSigners()
  console.log(`Deploying with account: ${deployer.address}`)
  
  const balance = await deployer.provider.getBalance(deployer.address)
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance < ethers.parseEther('0.01')) {
    console.error('❌ Insufficient balance for deployment')
    if (network.name === 'morphHolesky') {
      console.log('💡 Get testnet ETH from: https://faucet.quicknode.com/morph/holesky')
      console.log('   (Requires 0.001 ETH on Ethereum Mainnet)')
    }
    process.exit(1)
  }
  
  const deploymentResults = {}
  
  try {
    // ===========================================
    // DEPLOY MENO MARKETPLACE CONTRACT
    // ===========================================
    console.log('\n📦 Deploying MenoMarketplace...')
    
    const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace')
    const marketplace = await MenoMarketplace.deploy()
    await marketplace.waitForDeployment()
    
    const marketplaceAddress = await marketplace.getAddress()
    console.log(`✅ MenoMarketplace deployed to: ${marketplaceAddress}`)
    
    deploymentResults.menoMarketplace = {
      address: marketplaceAddress,
      contract: 'MenoMarketplace',
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      deploymentHash: marketplace.deploymentTransaction()?.hash
    }
    
    // ===========================================
    // DEPLOY FIAT OFF-RAMP CONTRACT
    // ===========================================
    console.log('\n📦 Deploying FiatOffRamp...')
    
    const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp')
    const fiatOffRamp = await FiatOffRamp.deploy()
    await fiatOffRamp.waitForDeployment()
    
    const fiatOffRampAddress = await fiatOffRamp.getAddress()
    console.log(`✅ FiatOffRamp deployed to: ${fiatOffRampAddress}`)
    
    deploymentResults.fiatOffRamp = {
      address: fiatOffRampAddress,
      contract: 'FiatOffRamp',
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      deploymentHash: fiatOffRamp.deploymentTransaction()?.hash
    }
    
    // ===========================================
    // INITIAL CONFIGURATION
    // ===========================================
    console.log('\n⚙️  Configuring contracts...')
    
    // Authorize FiatOffRamp contract in Marketplace for fiat conversions
    console.log('Setting up cross-contract authorization...')
    // This would be done in production after both contracts are deployed
    
    // Add initial off-ramp providers (example configuration)
    if (network.name === 'morphHolesky') {
      console.log('Adding test providers for testnet...')
      
      // Add Paycrest test provider
      await fiatOffRamp.addProvider(
        deployer.address, // Using deployer as test provider
        'Paycrest Test',
        ['USD', 'EUR', 'NGN'],
        ['US', 'EU', 'NG'],
        ethers.parseEther('0.01'), // Min: 0.01 ETH
        ethers.parseEther('10'),   // Max: 10 ETH
        250, // 2.5% fee
        ethers.parseEther('0.001') // 0.001 ETH fixed fee
      )
      console.log('✅ Test provider added')
    }
    
    // ===========================================
    // SAVE DEPLOYMENT RESULTS
    // ===========================================
    const deploymentFile = path.join(__dirname, '..', 'deployments', `${network.name}.json`)
    const deploymentDir = path.dirname(deploymentFile)
    
    // Create deployments directory if it doesn't exist
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true })
    }
    
    // Load existing deployments or create new
    let existingDeployments = {}
    if (fs.existsSync(deploymentFile)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
    }
    
    // Merge with existing deployments
    const updatedDeployments = {
      ...existingDeployments,
      ...deploymentResults,
      lastDeployment: new Date().toISOString(),
      networkInfo: {
        name: network.name,
        chainId: network.config.chainId,
        rpc: network.config.url
      }
    }
    
    fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployments, null, 2))
    console.log(`\n💾 Deployment results saved to: ${deploymentFile}`)
    
    // ===========================================
    // GENERATE ENVIRONMENT VARIABLES
    // ===========================================
    console.log('\n📝 Generating environment variables...')
    
    const envVars = generateEnvVars(network.name, deploymentResults)
    console.log('\n📋 Add these to your .env.local file:')
    console.log('=' .repeat(50))
    console.log(envVars)
    console.log('=' .repeat(50))
    
    // ===========================================
    // DEPLOYMENT SUMMARY
    // ===========================================
    console.log('\n🎉 Deployment Summary')
    console.log('=' .repeat(50))
    console.log(`Network: ${network.name}`)
    console.log(`Chain ID: ${network.config.chainId}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log(`MenoMarketplace: ${marketplaceAddress}`)
    console.log(`FiatOffRamp: ${fiatOffRampAddress}`)
    
    if (network.name === 'morphHolesky') {
      console.log(`\n🔗 Testnet Links:`)
      console.log(`Explorer: https://explorer-holesky.morphl2.io`)
      console.log(`Marketplace: https://explorer-holesky.morphl2.io/address/${marketplaceAddress}`)
      console.log(`FiatOffRamp: https://explorer-holesky.morphl2.io/address/${fiatOffRampAddress}`)
      console.log(`Faucet: https://faucet.quicknode.com/morph/holesky`)
    } else if (network.name === 'morphMainnet') {
      console.log(`\n🔗 Mainnet Links:`)
      console.log(`Explorer: https://explorer.morphl2.io`)
      console.log(`Marketplace: https://explorer.morphl2.io/address/${marketplaceAddress}`)
      console.log(`FiatOffRamp: https://explorer.morphl2.io/address/${fiatOffRampAddress}`)
    }
    
    console.log('\n✅ Deployment completed successfully!')
    
    // ===========================================
    // NEXT STEPS
    // ===========================================
    console.log('\n📋 Next Steps:')
    console.log('1. Update your .env.local file with the contract addresses above')
    console.log('2. Verify contracts on the block explorer (run: npm run verify)')
    console.log('3. Test the deployment with the frontend application')
    if (network.name === 'morphHolesky') {
      console.log('4. Prepare for hackathon demonstration')
      console.log('5. Deploy to mainnet when ready for production')
    } else {
      console.log('4. Configure production monitoring and alerts')
      console.log('5. Set up customer support and documentation')
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  }
}

function generateEnvVars(networkName, deploymentResults) {
  const isTestnet = networkName === 'morphHolesky'
  const prefix = isTestnet ? 'TESTNET' : 'MAINNET'
  
  return `
# ${networkName.toUpperCase()} CONTRACT ADDRESSES
NEXT_PUBLIC_${prefix}_MENO_MARKETPLACE_ADDRESS=${deploymentResults.menoMarketplace.address}
NEXT_PUBLIC_${prefix}_FIAT_OFFRAMP_ADDRESS=${deploymentResults.fiatOffRamp.address}

# Update your deployment environment
NEXT_PUBLIC_DEPLOYMENT_ENV=${isTestnet ? 'testnet' : 'mainnet'}
`
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