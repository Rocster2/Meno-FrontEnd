const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing NFT Contract Direct Access...");
  
  const contractAddress = process.env.NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS;
  console.log("Contract Address:", contractAddress);
  
  // Create provider
  const provider = new ethers.JsonRpcProvider('https://rpc-quicknode-holesky.morphl2.io');
  
  // Simple ABI
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    // Get basic info
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();
    
    console.log("\n📋 Contract Info:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", totalSupply.toString());
    
    if (totalSupply.toString() !== "0") {
      // Get token 0 details
      const tokenURI = await contract.tokenURI(0);
      const owner = await contract.ownerOf(0);
      
      console.log("\n🎯 Token 0 Details:");
      console.log("Owner:", owner);
      console.log("Token URI (raw):", tokenURI);
      
      // Clean up the URI
      let cleanURI = tokenURI;
      if (cleanURI.includes('https://ipfs.io/ipfs/ipfs://')) {
        cleanURI = cleanURI.replace('https://ipfs.io/ipfs/ipfs://', 'ipfs://');
      }
      if (cleanURI.includes('ipfs://ipfs://')) {
        cleanURI = cleanURI.replace('ipfs://ipfs://', 'ipfs://');
      }
      
      const httpUrl = cleanURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
      
      console.log("Cleaned URI:", cleanURI);
      console.log("HTTP URL:", httpUrl);
      
      // Try to fetch metadata
      try {
        console.log("\n🌐 Fetching metadata...");
        const response = await fetch(httpUrl);
        if (response.ok) {
          const metadata = await response.json();
          console.log("Metadata:", JSON.stringify(metadata, null, 2));
          
          // Test image URL
          if (metadata.image) {
            const imageUrl = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
            console.log("Image URL:", imageUrl);
          }
        } else {
          console.log("Failed to fetch metadata:", response.status, response.statusText);
        }
      } catch (fetchError) {
        console.error("Error fetching metadata:", fetchError.message);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });