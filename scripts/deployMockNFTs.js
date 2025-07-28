const { ethers } = require("hardhat");

async function main() {
  console.log("🎨 Deploying Mock NFT Collections for Testing...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy multiple test NFT collections
  const collections = [
    {
      name: "Test Akuma Collection",
      symbol: "TAKUMA",
      baseURI: "https://api.example.com/akuma/"
    },
    {
      name: "Test Kurai Collection", 
      symbol: "TKURAI",
      baseURI: "https://api.example.com/kurai/"
    },
    {
      name: "Test 404 Collection",
      symbol: "T404",
      baseURI: "https://api.example.com/404/"
    }
  ];

  const deployedCollections = [];

  for (const collection of collections) {
    console.log(`\n📦 Deploying ${collection.name}...`);
    
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const nftContract = await MockERC721.deploy(
      collection.name,
      collection.symbol,
      collection.baseURI
    );
    
    await nftContract.waitForDeployment();
    const contractAddress = await nftContract.getAddress();
    
    console.log(`✅ ${collection.name} deployed to:`, contractAddress);
    
    // Mint some test NFTs to the deployer
    console.log(`🎯 Minting test NFTs...`);
    const mintTx = await nftContract.batchMint(deployer.address, 5);
    await mintTx.wait();
    
    console.log(`✅ Minted 5 NFTs to ${deployer.address}`);
    
    deployedCollections.push({
      name: collection.name,
      symbol: collection.symbol,
      address: contractAddress,
      contract: nftContract
    });
  }

  // Save deployment info
  const deploymentInfo = {
    network: "morphHolesky", // or morphMainnet
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    collections: deployedCollections.map(c => ({
      name: c.name,
      symbol: c.symbol,
      address: c.address
    }))
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    './deployments/mockNFTs.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n✅ Mock NFT deployment completed!");
  console.log("💡 You can now use these NFTs for testing your off-ramp functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });