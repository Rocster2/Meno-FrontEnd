const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Hackathon Demo NFT deployment...");
  
  const contractAddress = process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error("❌ Contract address not found in environment variables");
    return;
  }
  
  console.log("Contract Address:", contractAddress);
  
  // Get the contract instance
  const HackathonDemoNFT = await ethers.getContractFactory("HackathonDemoNFT");
  const contract = HackathonDemoNFT.attach(contractAddress);
  
  try {
    // Get contract info
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();
    
    console.log("\n📋 Contract Information:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", totalSupply.toString());
    
    // Check if we have any NFTs
    if (totalSupply.toString() !== "0") {
      console.log("\n🎯 Demo NFT Details:");
      
      // Get token 0 details
      const tokenURI = await contract.tokenURI(0);
      const owner = await contract.ownerOf(0);
      
      console.log("Token ID: 0");
      console.log("Token URI:", tokenURI);
      console.log("Owner:", owner);
      
      // Try to fetch metadata
      if (tokenURI.startsWith('ipfs://')) {
        const ipfsUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
        console.log("IPFS URL:", ipfsUrl);
        
        try {
          const response = await fetch(ipfsUrl);
          const metadata = await response.json();
          console.log("Metadata:", JSON.stringify(metadata, null, 2));
        } catch (error) {
          console.warn("Could not fetch metadata:", error.message);
        }
      }
    } else {
      console.log("\n⚠️  No NFTs have been minted yet");
    }
    
    console.log("\n🔗 Useful Links:");
    console.log("Explorer:", `https://explorer-holesky.morphl2.io/address/${contractAddress}`);
    console.log("Network: Morph Holesky Testnet (Chain ID: 2810)");
    
    console.log("\n✅ Verification completed successfully!");
    
  } catch (error) {
    console.error("❌ Error verifying contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });