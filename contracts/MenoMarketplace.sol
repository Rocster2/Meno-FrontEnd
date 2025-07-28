// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MenoMarketplace
 * @dev NFT Marketplace contract with cross-platform synchronization and fiat off-ramp integration
 * @author Meno Team
 */
contract MenoMarketplace is ReentrancyGuard, Ownable {
    
    // ===========================================
    // STATE VARIABLES
    // ===========================================
    
    uint256 private _listingIds;
    
    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;
    
    // Minimum listing duration (1 hour)
    uint256 public constant MIN_LISTING_DURATION = 3600;
    
    // Maximum listing duration (30 days)
    uint256 public constant MAX_LISTING_DURATION = 2592000;
    
    // ===========================================
    // STRUCTS
    // ===========================================
    
    struct Listing {
        bytes32 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
        bool fiatEnabled;
        address externalMarketplace;
        bytes32 externalListingId;
    }
    
    struct Sale {
        bytes32 listingId;
        address buyer;
        address seller;
        uint256 price;
        uint256 platformFeeAmount;
        uint256 sellerAmount;
        uint256 soldAt;
        bool fiatConversionRequested;
    }
    
    // ===========================================
    // MAPPINGS
    // ===========================================
    
    mapping(bytes32 => Listing) public listings;
    mapping(address => uint256) public sellerProceeds;
    mapping(address => bytes32[]) public sellerListings;
    mapping(bytes32 => Sale) public sales;
    
    // Cross-platform synchronization
    mapping(bytes32 => mapping(address => bytes32)) public externalListings;
    mapping(address => bool) public authorizedMarketplaces;
    
    // ===========================================
    // EVENTS
    // ===========================================
    
    event NFTListed(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expiresAt,
        bool fiatEnabled
    );
    
    event NFTSold(
        bytes32 indexed listingId,
        address indexed buyer,
        address indexed seller,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 platformFeeAmount
    );
    
    event PriceUpdated(
        bytes32 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );
    
    event ListingCancelled(
        bytes32 indexed listingId,
        address indexed seller
    );
    
    event ListingExpired(
        bytes32 indexed listingId,
        address indexed seller
    );
    
    event FiatConversionRequested(
        bytes32 indexed listingId,
        address indexed seller,
        uint256 amount
    );
    
    event ExternalMarketplaceSync(
        bytes32 indexed listingId,
        address indexed externalMarketplace,
        bytes32 externalListingId
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ===========================================
    // MODIFIERS
    // ===========================================
    
    modifier validListing(bytes32 listingId) {
        require(listings[listingId].seller != address(0), "Listing does not exist");
        _;
    }
    
    modifier onlySeller(bytes32 listingId) {
        require(listings[listingId].seller == msg.sender, "Not the seller");
        _;
    }
    
    modifier listingActive(bytes32 listingId) {
        require(listings[listingId].isActive, "Listing is not active");
        require(block.timestamp < listings[listingId].expiresAt, "Listing has expired");
        _;
    }
    
    modifier authorizedMarketplace() {
        require(authorizedMarketplaces[msg.sender] || msg.sender == owner(), "Not authorized marketplace");
        _;
    }
    
    // ===========================================
    // CONSTRUCTOR
    // ===========================================
    
    constructor() Ownable(msg.sender) {
        // Initialize with owner as authorized marketplace
        authorizedMarketplaces[msg.sender] = true;
    }
    
    // ===========================================
    // CORE MARKETPLACE FUNCTIONS
    // ===========================================
    
    /**
     * @dev List an NFT for sale
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @param price Price in wei
     * @param duration Listing duration in seconds
     * @param enableFiatOffRamp Whether to enable fiat off-ramp for this listing
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        bool enableFiatOffRamp
    ) external returns (bytes32) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(price > 0, "Price must be greater than 0");
        require(duration >= MIN_LISTING_DURATION && duration <= MAX_LISTING_DURATION, "Invalid duration");
        
        // Verify ownership and approval
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");
        require(
            nft.getApproved(tokenId) == address(this) || 
            nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );
        
        // Generate unique listing ID
        _listingIds++;
        bytes32 listingId = keccak256(
            abi.encodePacked(
                nftContract,
                tokenId,
                msg.sender,
                block.timestamp,
                _listingIds
            )
        );
        
        // Create listing
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            isActive: true,
            fiatEnabled: enableFiatOffRamp,
            externalMarketplace: address(0),
            externalListingId: bytes32(0)
        });
        
        // Add to seller's listings
        sellerListings[msg.sender].push(listingId);
        
        emit NFTListed(
            listingId,
            msg.sender,
            nftContract,
            tokenId,
            price,
            block.timestamp + duration,
            enableFiatOffRamp
        );
        
        return listingId;
    }
    
    /**
     * @dev Buy an NFT
     * @param listingId The listing ID to purchase
     */
    function buyNFT(bytes32 listingId) 
        external 
        payable 
        nonReentrant 
        validListing(listingId) 
        listingActive(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        
        // Calculate fees
        uint256 platformFeeAmount = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - platformFeeAmount;
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Record sale
        sales[listingId] = Sale({
            listingId: listingId,
            buyer: msg.sender,
            seller: listing.seller,
            price: listing.price,
            platformFeeAmount: platformFeeAmount,
            sellerAmount: sellerAmount,
            soldAt: block.timestamp,
            fiatConversionRequested: false
        });
        
        // Add to seller proceeds
        sellerProceeds[listing.seller] += sellerAmount;
        
        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        // Handle excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        emit NFTSold(
            listingId,
            msg.sender,
            listing.seller,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            platformFeeAmount
        );
        
        // Request fiat conversion if enabled
        if (listing.fiatEnabled) {
            sales[listingId].fiatConversionRequested = true;
            emit FiatConversionRequested(listingId, listing.seller, sellerAmount);
        }
    }
    
    /**
     * @dev Update the price of a listing
     * @param listingId The listing ID to update
     * @param newPrice The new price in wei
     */
    function updatePrice(bytes32 listingId, uint256 newPrice) 
        external 
        validListing(listingId) 
        onlySeller(listingId) 
        listingActive(listingId) 
    {
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = listings[listingId].price;
        listings[listingId].price = newPrice;
        
        emit PriceUpdated(listingId, oldPrice, newPrice);
    }
    
    /**
     * @dev Cancel a listing
     * @param listingId The listing ID to cancel
     */
    function cancelListing(bytes32 listingId) 
        external 
        validListing(listingId) 
        onlySeller(listingId) 
    {
        require(listings[listingId].isActive, "Listing is not active");
        
        listings[listingId].isActive = false;
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    // ===========================================
    // CROSS-PLATFORM SYNCHRONIZATION
    // ===========================================
    
    /**
     * @dev Sync listing with external marketplace
     * @param listingId Internal listing ID
     * @param externalMarketplace Address of external marketplace
     * @param externalListingId External marketplace listing ID
     */
    function syncWithExternalMarketplace(
        bytes32 listingId,
        address externalMarketplace,
        bytes32 externalListingId
    ) external validListing(listingId) onlySeller(listingId) {
        require(authorizedMarketplaces[externalMarketplace], "Marketplace not authorized");
        
        listings[listingId].externalMarketplace = externalMarketplace;
        listings[listingId].externalListingId = externalListingId;
        
        externalListings[listingId][externalMarketplace] = externalListingId;
        
        emit ExternalMarketplaceSync(listingId, externalMarketplace, externalListingId);
    }
    
    /**
     * @dev Mark listing as sold on external marketplace
     * @param listingId The listing ID that was sold externally
     * @param buyer The buyer address
     * @param salePrice The sale price
     */
    function markSoldExternally(
        bytes32 listingId,
        address buyer,
        uint256 salePrice
    ) external authorizedMarketplace validListing(listingId) {
        require(listings[listingId].isActive, "Listing is not active");
        
        Listing storage listing = listings[listingId];
        listing.isActive = false;
        
        // Record external sale
        sales[listingId] = Sale({
            listingId: listingId,
            buyer: buyer,
            seller: listing.seller,
            price: salePrice,
            platformFeeAmount: 0, // No platform fee for external sales
            sellerAmount: salePrice,
            soldAt: block.timestamp,
            fiatConversionRequested: listing.fiatEnabled
        });
        
        emit NFTSold(
            listingId,
            buyer,
            listing.seller,
            listing.nftContract,
            listing.tokenId,
            salePrice,
            0
        );
        
        if (listing.fiatEnabled) {
            emit FiatConversionRequested(listingId, listing.seller, salePrice);
        }
    }
    
    // ===========================================
    // SELLER FUNCTIONS
    // ===========================================
    
    /**
     * @dev Withdraw seller proceeds
     */
    function withdrawProceeds() external nonReentrant {
        uint256 amount = sellerProceeds[msg.sender];
        require(amount > 0, "No proceeds to withdraw");
        
        sellerProceeds[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    /**
     * @dev Get seller's active listings
     * @param seller The seller address
     */
    function getSellerListings(address seller) external view returns (bytes32[] memory) {
        return sellerListings[seller];
    }
    
    // ===========================================
    // ADMIN FUNCTIONS
    // ===========================================
    
    /**
     * @dev Update platform fee (only owner)
     * @param newFee New platform fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        
        uint256 oldFee = platformFee;
        platformFee = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @dev Authorize external marketplace
     * @param marketplace Address of the marketplace to authorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedMarketplace(address marketplace, bool authorized) external onlyOwner {
        authorizedMarketplaces[marketplace] = authorized;
    }
    
    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Emergency function to expire listings (only owner)
     * @param listingId The listing ID to expire
     */
    function expireListing(bytes32 listingId) external onlyOwner validListing(listingId) {
        require(listings[listingId].isActive, "Listing is not active");
        
        listings[listingId].isActive = false;
        
        emit ListingExpired(listingId, listings[listingId].seller);
    }
    
    // ===========================================
    // VIEW FUNCTIONS
    // ===========================================
    
    /**
     * @dev Get listing details
     * @param listingId The listing ID
     */
    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    /**
     * @dev Get sale details
     * @param listingId The listing ID
     */
    function getSale(bytes32 listingId) external view returns (Sale memory) {
        return sales[listingId];
    }
    
    /**
     * @dev Check if listing is active and not expired
     * @param listingId The listing ID
     */
    function isListingActive(bytes32 listingId) external view returns (bool) {
        return listings[listingId].isActive && block.timestamp < listings[listingId].expiresAt;
    }
    
    /**
     * @dev Get current listing count
     */
    function getCurrentListingId() external view returns (uint256) {
        return _listingIds;
    }
}