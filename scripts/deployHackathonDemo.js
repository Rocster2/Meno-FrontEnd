const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Hackathon Demo NFT to Morph Testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance! You might need more testnet ETH from the faucet");
  }

  // Deploy the HackathonDemoNFT contract
  console.log("\n📦 Deploying HackathonDemoNFT contract...");
  
  const HackathonDemoNFT = await ethers.getContractFactory("HackathonDemoNFT");
  const demoNFT = await HackathonDemoNFT.deploy(
    "Morph Hackathon Demo Collection",
    "MHDC",
    "https://ipfs.io/ipfs/" // Base URI for IPFS
  );
  
  await demoNFT.waitForDeployment();
  const contractAddress = await demoNFT.getAddress();
  
  console.log("✅ HackathonDemoNFT deployed to:", contractAddress);
  
  // Get metadata CID from environment or use the one from metadata.json
  const metadataCID = process.env.NEXT_PUBLIC_NFT_METADATA_CID;
  
  if (!metadataCID) {
    console.error("❌ NEXT_PUBLIC_NFT_METADATA_CID not found in environment variables");
    console.log("Please add your metadata CID to the .env file");
    return;
  }
  
  // Mint demo NFT with the metadata
  console.log("\n🎯 Minting demo NFT...");
  // Clean the CID in case it already has ipfs:// prefix
  const cleanCID = metadataCID.replace('ipfs://', '');
  const metadataURI = `ipfs://${cleanCID}`;
  
  console.log("Using metadata URI:", metadataURI);
  
  const mintTx = await demoNFT.mintWithURI(deployer.address, metadataURI);
  const receipt = await mintTx.wait();
  
  console.log("✅ Demo NFT minted successfully!");
  console.log("Transaction hash:", receipt.hash);
  
  // Get the token ID from the event
  const mintEvent = receipt.logs.find(log => {
    try {
      const parsed = demoNFT.interface.parseLog(log);
      return parsed.name === 'NFTMinted';
    } catch (e) {
      return false;
    }
  });
  
  let tokenId = 0;
  if (mintEvent) {
    const parsed = demoNFT.interface.parseLog(mintEvent);
    tokenId = parsed.args.tokenId.toString();
    console.log("Token ID:", tokenId);
  }

  // Create deployment info
  const deploymentInfo = {
    network: "morphHolesky",
    chainId: 2810,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      hackathonDemoNFT: {
        name: "Morph Hackathon Demo Collection",
        symbol: "MHDC",
        address: contractAddress,
        deploymentHash: demoNFT.deploymentTransaction().hash
      }
    },
    demoNFT: {
      tokenId: tokenId,
      metadataURI: metadataURI,
      owner: deployer.address,
      mintTransactionHash: receipt.hash
    }
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentFile = path.join(deploymentsDir, 'hackathonDemo.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📋 Deployment Summary:");
  console.log("Contract Address:", contractAddress);
  console.log("Demo NFT Token ID:", tokenId);
  console.log("Metadata URI:", metadataURI);
  console.log("Owner:", deployer.address);
  
  console.log("\n🔗 Useful Links:");
  console.log("Explorer:", `https://explorer-holesky.morphl2.io/address/${contractAddress}`);
  console.log("Transaction:", `https://explorer-holesky.morphl2.io/tx/${receipt.hash}`);
  
  console.log("\n✅ Hackathon demo deployment completed!");
  console.log("💡 Your NFT should now be visible in the dashboard when you connect your wallet");
  
  // Update .env with contract address
  console.log("\n📝 Add this to your .env file:");
  console.log(`NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });