/**
 * Deploy MenoMarketplace Contract to Morph Networks
 * Supports both Morph Holesky Testnet and Morph Mainnet
 */

const { ethers } = require('hardhat');
const { getCurrentNetwork } = require('../lib/network-config');

async function main() {
  console.log('🚀 Deploying MenoMarketplace Contract...');
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther('0.01')) {
    console.error('❌ Insufficient balance for deployment. Need at least 0.01 ETH');
    process.exit(1);
  }
  
  try {
    // Deploy MenoMarketplace
    console.log('\n📦 Deploying MenoMarketplace...');
    const MenoMarketplace = await ethers.getContractFactory('MenoMarketplace');
    
    // Deploy with higher gas limit for complex contract
    const marketplace = await MenoMarketplace.deploy({
      gasLimit: 5000000 // 5M gas limit for complex contract
    });
    
    console.log(`Transaction hash: ${marketplace.deploymentTransaction().hash}`);
    console.log('⏳ Waiting for deployment confirmation...');
    
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    
    console.log(`✅ MenoMarketplace deployed to: ${marketplaceAddress}`);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const code = await ethers.provider.getCode(marketplaceAddress);
    if (code === '0x') {
      console.error('❌ Contract deployment failed - no code at address');
      process.exit(1);
    }
    
    // Test basic functionality
    console.log('\n🧪 Testing basic functionality...');
    const platformFee = await marketplace.platformFee();
    const currentListingId = await marketplace.getCurrentListingId();
    
    console.log(`Platform fee: ${platformFee.toString()} basis points (${Number(platformFee) / 100}%)`);
    console.log(`Current listing ID: ${currentListingId.toString()}`);
    
    // Deploy FiatOffRamp if needed
    console.log('\n📦 Deploying FiatOffRamp...');
    const FiatOffRamp = await ethers.getContractFactory('FiatOffRamp');
    
    const fiatOffRamp = await FiatOffRamp.deploy({
      gasLimit: 3000000 // 3M gas limit
    });
    
    await fiatOffRamp.waitForDeployment();
    const fiatOffRampAddress = await fiatOffRamp.getAddress();
    
    console.log(`✅ FiatOffRamp deployed to: ${fiatOffRampAddress}`);
    
    // Output deployment summary
    console.log('\n📋 Deployment Summary:');
    console.log('='.repeat(50));
    console.log(`Network: ${network.name} (${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`MenoMarketplace: ${marketplaceAddress}`);
    console.log(`FiatOffRamp: ${fiatOffRampAddress}`);
    console.log('='.repeat(50));
    
    // Generate environment variables
    console.log('\n📝 Environment Variables:');
    console.log('Add these to your .env file:');
    console.log('');
    
    if (network.chainId === 2810n) {
      // Morph Holesky Testnet
      console.log(`NEXT_PUBLIC_TESTNET_MENO_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
      console.log(`NEXT_PUBLIC_TESTNET_FIAT_OFFRAMP_ADDRESS=${fiatOffRampAddress}`);
    } else if (network.chainId === 2818n) {
      // Morph Mainnet
      console.log(`NEXT_PUBLIC_MAINNET_MENO_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
      console.log(`NEXT_PUBLIC_MAINNET_FIAT_OFFRAMP_ADDRESS=${fiatOffRampAddress}`);
    }
    
    console.log('\n🎉 Deployment completed successfully!');
    
    // Save deployment info to file
    const fs = require('fs');
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        MenoMarketplace: marketplaceAddress,
        FiatOffRamp: fiatOffRampAddress
      },
      deployedAt: new Date().toISOString(),
      transactionHashes: {
        MenoMarketplace: marketplace.deploymentTransaction().hash,
        FiatOffRamp: fiatOffRamp.deploymentTransaction().hash
      }
    };
    
    const filename = `deployment-${network.chainId}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 Deployment info saved to: ${filename}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };