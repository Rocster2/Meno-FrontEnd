# 🎯 Morph Hackathon Demo Setup

## Overview
This demo showcases the Meno NFT Off-ramp platform running on Morph Holesky Testnet with a live deployed NFT for demonstration purposes.

## 🚀 Deployed Demo NFT

### Contract Details
- **Contract Address**: `0xf85b48fAEba258F80931030dd963e5c82fa591d8`
- **Network**: Morph Holesky Testnet (Chain ID: 2810)
- **Contract Name**: Morph Hackathon Demo Collection
- **Symbol**: MHDC
- **Explorer**: [View on Morph Explorer](https://explorer-holesky.morphl2.io/address/0xf85b48fAEba258F80931030dd963e5c82fa591d8)

### Demo NFT Details
- **Token ID**: 0
- **Owner**: `0x5230b89d6728a10b34b8EC1C740a7A7a1C4afe94`
- **Metadata**: Stored on IPFS
- **Image**: Hosted on IPFS

## 🎮 How to Test the Demo

### 1. Connect Your Wallet
- Open the application
- Connect your MetaMask wallet
- Make sure you're on Morph Holesky Testnet (Chain ID: 2810)

### 2. View Demo NFT
- Navigate to the Dashboard
- Click on the "🎯 Demo NFT" tab (should be the default tab)
- You'll see the deployed demo NFT with all its details

### 3. Demo Workflow
The demo demonstrates the complete NFT off-ramp workflow:

1. **View NFT**: See the NFT with metadata, image, and attributes
2. **List for Sale**: Click "List for Sale" to demonstrate marketplace listing
3. **Off-ramp Process**: Simulate converting NFT sale proceeds to fiat

## 🔧 Technical Implementation

### Files Added/Modified
1. **`contracts/HackathonDemoNFT.sol`** - Demo NFT contract
2. **`scripts/deployHackathonDemo.js`** - Deployment script
3. **`scripts/verifyDemo.js`** - Verification script
4. **`lib/services/DemoNFTService.js`** - Service for demo NFT interaction
5. **`components/DemoNFTDisplay.jsx`** - UI component for demo NFT
6. **`components/UserDashboard.jsx`** - Updated to include demo tab

### Environment Variables Added
```env
NEXT_PUBLIC_NFT_METADATA_CID=bafkreibgcdm55pf5kiuevhex2sxcz22ofpyqbtxr7no2pb37xoe6kggmt4
NEXT_PUBLIC_DEMO_NFT_CONTRACT_ADDRESS=0xf85b48fAEba258F80931030dd963e5c82fa591d8
```

## 🌐 Network Configuration

### Morph Holesky Testnet
- **Chain ID**: 2810
- **RPC URL**: https://rpc-quicknode-holesky.morphl2.io
- **Explorer**: https://explorer-holesky.morphl2.io
- **Faucet**: Get testnet ETH from Morph faucet

## 📱 Demo Features

### NFT Display
- ✅ NFT image from IPFS
- ✅ Metadata display (name, description, attributes)
- ✅ Owner information
- ✅ Contract details
- ✅ Explorer links

### Marketplace Integration
- ✅ "List for Sale" button
- ✅ Integration with existing marketplace contracts
- ✅ Transaction monitoring

### Off-ramp Simulation
- ✅ Fiat conversion simulation
- ✅ Multiple payment provider support
- ✅ Transaction status tracking

## 🚀 Running the Demo

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application
```bash
npm run dev
```

### 3. Access the Demo
- Open http://localhost:3000
- Connect your wallet
- Navigate to Dashboard → Demo NFT tab

## 🔍 Verification Commands

### Verify Contract Deployment
```bash
npx hardhat run scripts/verifyDemo.js --network morphHolesky
```

### Check Contract on Explorer
Visit: https://explorer-holesky.morphl2.io/address/0xf85b48fAEba258F80931030dd963e5c82fa591d8

## 🎯 Hackathon Demonstration Points

1. **Live Blockchain Integration**: Real NFT deployed on Morph testnet
2. **IPFS Metadata**: Decentralized metadata and image storage
3. **Wallet Integration**: MetaMask connection with Morph network
4. **UI/UX**: Clean, responsive interface for NFT display
5. **Off-ramp Ready**: Integration points for fiat conversion
6. **Transaction Monitoring**: Real-time transaction status
7. **Multi-marketplace Support**: Ready for various NFT marketplaces

## 🔗 Important Links

- **Contract**: https://explorer-holesky.morphl2.io/address/0xf85b48fAEba258F80931030dd963e5c82fa591d8
- **Morph Docs**: https://docs.morphl2.io
- **Hackathon**: https://dorahacks.io/hackathon/morph-consumer-buildathon/buidl

## 🎉 Demo Success Criteria

- ✅ NFT contract deployed on Morph testnet
- ✅ NFT minted with IPFS metadata
- ✅ Frontend displays NFT correctly
- ✅ Wallet connection works
- ✅ Explorer links functional
- ✅ Ready for marketplace listing demo
- ✅ Off-ramp integration points ready

The demo is now ready for the hackathon presentation! 🚀