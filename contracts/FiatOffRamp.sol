// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FiatOffRamp
 * @dev Smart contract for managing fiat off-ramp conversions with multiple provider support
 * @author Meno Team
 */
contract FiatOffRamp is ReentrancyGuard, Ownable {
    
    // ===========================================
    // STATE VARIABLES
    // ===========================================
    
    uint256 private _requestIds;
    
    // Minimum conversion amount (0.01 ETH)
    uint256 public constant MIN_CONVERSION_AMOUNT = 0.01 ether;
    
    // Maximum conversion amount (100 ETH)
    uint256 public constant MAX_CONVERSION_AMOUNT = 100 ether;
    
    // Request timeout (24 hours)
    uint256 public constant REQUEST_TIMEOUT = 86400;
    
    // ===========================================
    // ENUMS
    // ===========================================
    
    enum ConversionStatus {
        Pending,
        Processing,
        Completed,
        Failed,
        Cancelled,
        Expired
    }
    
    enum ProviderStatus {
        Active,
        Inactive,
        Maintenance
    }
    
    // ===========================================
    // STRUCTS
    // ===========================================
    
    struct ConversionRequest {
        bytes32 requestId;
        address user;
        uint256 amount;
        string currency;
        string bankDetails;
        address preferredProvider;
        address assignedProvider;
        uint256 requestedAt;
        uint256 processedAt;
        uint256 completedAt;
        ConversionStatus status;
        string failureReason;
        uint256 exchangeRate;
        uint256 fiatAmount;
        uint256 fees;
    }
    
    struct OffRampProvider {
        address providerAddress;
        string name;
        string[] supportedCurrencies;
        string[] supportedCountries;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 feePercentage; // in basis points
        uint256 fixedFee; // in wei
        ProviderStatus status;
        uint256 totalProcessed;
        uint256 successfulConversions;
        uint256 failedConversions;
    }
    
    struct UserProfile {
        bool isKYCVerified;
        string kycLevel;
        uint256 totalConverted;
        uint256 conversionCount;
        uint256 lastConversionAt;
        bool isBlacklisted;
    }
    
    // ===========================================
    // MAPPINGS
    // ===========================================
    
    mapping(bytes32 => ConversionRequest) public conversionRequests;
    mapping(address => OffRampProvider) public providers;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => bytes32[]) public userRequests;
    mapping(string => address[]) public currencyProviders;
    
    // Provider management
    address[] public providerList;
    mapping(address => bool) public authorizedOperators;
    
    // ===========================================
    // EVENTS
    // ===========================================
    
    event ConversionRequested(
        bytes32 indexed requestId,
        address indexed user,
        uint256 amount,
        string currency,
        address preferredProvider
    );
    
    event ConversionAssigned(
        bytes32 indexed requestId,
        address indexed provider,
        uint256 exchangeRate,
        uint256 fiatAmount,
        uint256 fees
    );
    
    event ConversionProcessing(
        bytes32 indexed requestId,
        address indexed provider
    );
    
    event ConversionCompleted(
        bytes32 indexed requestId,
        address indexed user,
        address indexed provider,
        uint256 amount,
        uint256 fiatAmount
    );
    
    event ConversionFailed(
        bytes32 indexed requestId,
        address indexed user,
        address indexed provider,
        string reason
    );
    
    event ConversionCancelled(
        bytes32 indexed requestId,
        address indexed user
    );
    
    event ProviderAdded(
        address indexed provider,
        string name
    );
    
    event ProviderUpdated(
        address indexed provider,
        ProviderStatus status
    );
    
    event KYCStatusUpdated(
        address indexed user,
        bool isVerified,
        string kycLevel
    );
    
    // ===========================================
    // MODIFIERS
    // ===========================================
    
    modifier validRequest(bytes32 requestId) {
        require(conversionRequests[requestId].user != address(0), "Request does not exist");
        _;
    }
    
    modifier onlyRequestOwner(bytes32 requestId) {
        require(conversionRequests[requestId].user == msg.sender, "Not request owner");
        _;
    }
    
    modifier onlyProvider() {
        require(providers[msg.sender].providerAddress != address(0), "Not a registered provider");
        require(providers[msg.sender].status == ProviderStatus.Active, "Provider not active");
        _;
    }
    
    modifier onlyOperator() {
        require(authorizedOperators[msg.sender] || msg.sender == owner(), "Not authorized operator");
        _;
    }
    
    modifier kycRequired() {
        require(userProfiles[msg.sender].isKYCVerified, "KYC verification required");
        require(!userProfiles[msg.sender].isBlacklisted, "User is blacklisted");
        _;
    }
    
    // ===========================================
    // CONSTRUCTOR
    // ===========================================
    
    constructor() Ownable(msg.sender) {
        authorizedOperators[msg.sender] = true;
    }
    
    // ===========================================
    // CORE CONVERSION FUNCTIONS
    // ===========================================
    
    /**
     * @dev Request fiat conversion
     * @param amount Amount in wei to convert
     * @param currency Target fiat currency (e.g., "USD", "EUR")
     * @param bankDetails Encrypted bank details
     * @param preferredProvider Preferred off-ramp provider address
     */
    function requestFiatConversion(
        uint256 amount,
        string calldata currency,
        string calldata bankDetails,
        address preferredProvider
    ) external payable nonReentrant kycRequired returns (bytes32) {
        require(msg.value == amount, "Sent value must match amount");
        require(amount >= MIN_CONVERSION_AMOUNT && amount <= MAX_CONVERSION_AMOUNT, "Invalid amount");
        require(bytes(currency).length > 0, "Currency required");
        require(bytes(bankDetails).length > 0, "Bank details required");
        
        // Validate preferred provider if specified
        if (preferredProvider != address(0)) {
            require(providers[preferredProvider].status == ProviderStatus.Active, "Preferred provider not active");
            require(_supportsConversion(preferredProvider, currency, amount), "Provider doesn't support this conversion");
        }
        
        // Generate unique request ID
        _requestIds++;
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                currency,
                block.timestamp,
                _requestIds
            )
        );
        
        // Create conversion request
        conversionRequests[requestId] = ConversionRequest({
            requestId: requestId,
            user: msg.sender,
            amount: amount,
            currency: currency,
            bankDetails: bankDetails,
            preferredProvider: preferredProvider,
            assignedProvider: address(0),
            requestedAt: block.timestamp,
            processedAt: 0,
            completedAt: 0,
            status: ConversionStatus.Pending,
            failureReason: "",
            exchangeRate: 0,
            fiatAmount: 0,
            fees: 0
        });
        
        // Add to user's requests
        userRequests[msg.sender].push(requestId);
        
        emit ConversionRequested(requestId, msg.sender, amount, currency, preferredProvider);
        
        // Auto-assign provider if possible
        _autoAssignProvider(requestId);
        
        return requestId;
    }
    
    /**
     * @dev Assign provider to conversion request (operator only)
     * @param requestId The conversion request ID
     * @param provider The provider address to assign
     * @param exchangeRate The exchange rate (scaled by 1e18)
     * @param fees The conversion fees in wei
     */
    function assignProvider(
        bytes32 requestId,
        address provider,
        uint256 exchangeRate,
        uint256 fees
    ) external onlyOperator validRequest(requestId) {
        ConversionRequest storage request = conversionRequests[requestId];
        require(request.status == ConversionStatus.Pending, "Request not pending");
        require(providers[provider].status == ProviderStatus.Active, "Provider not active");
        require(_supportsConversion(provider, request.currency, request.amount), "Provider doesn't support conversion");
        
        // Calculate fiat amount
        uint256 fiatAmount = (request.amount * exchangeRate) / 1e18;
        require(fiatAmount > 0, "Invalid exchange rate");
        
        // Update request
        request.assignedProvider = provider;
        request.exchangeRate = exchangeRate;
        request.fiatAmount = fiatAmount;
        request.fees = fees;
        request.status = ConversionStatus.Processing;
        request.processedAt = block.timestamp;
        
        emit ConversionAssigned(requestId, provider, exchangeRate, fiatAmount, fees);
        emit ConversionProcessing(requestId, provider);
    }
    
    /**
     * @dev Complete conversion (provider only)
     * @param requestId The conversion request ID
     */
    function completeConversion(bytes32 requestId) external onlyProvider validRequest(requestId) {
        ConversionRequest storage request = conversionRequests[requestId];
        require(request.assignedProvider == msg.sender, "Not assigned provider");
        require(request.status == ConversionStatus.Processing, "Request not processing");
        
        // Update request status
        request.status = ConversionStatus.Completed;
        request.completedAt = block.timestamp;
        
        // Update provider stats
        providers[msg.sender].totalProcessed += request.amount;
        providers[msg.sender].successfulConversions++;
        
        // Update user profile
        userProfiles[request.user].totalConverted += request.amount;
        userProfiles[request.user].conversionCount++;
        userProfiles[request.user].lastConversionAt = block.timestamp;
        
        // Transfer fees to provider (if any)
        if (request.fees > 0) {
            payable(msg.sender).transfer(request.fees);
        }
        
        emit ConversionCompleted(
            requestId,
            request.user,
            msg.sender,
            request.amount,
            request.fiatAmount
        );
    }
    
    /**
     * @dev Mark conversion as failed (provider only)
     * @param requestId The conversion request ID
     * @param reason Failure reason
     */
    function failConversion(
        bytes32 requestId,
        string calldata reason
    ) external onlyProvider validRequest(requestId) {
        ConversionRequest storage request = conversionRequests[requestId];
        require(request.assignedProvider == msg.sender, "Not assigned provider");
        require(request.status == ConversionStatus.Processing, "Request not processing");
        
        // Update request status
        request.status = ConversionStatus.Failed;
        request.failureReason = reason;
        
        // Update provider stats
        providers[msg.sender].failedConversions++;
        
        // Refund user (minus any processing fees)
        uint256 refundAmount = request.amount - request.fees;
        if (refundAmount > 0) {
            payable(request.user).transfer(refundAmount);
        }
        
        // Transfer fees to provider (if any)
        if (request.fees > 0) {
            payable(msg.sender).transfer(request.fees);
        }
        
        emit ConversionFailed(requestId, request.user, msg.sender, reason);
    }
    
    /**
     * @dev Cancel conversion request (user only)
     * @param requestId The conversion request ID
     */
    function cancelConversion(bytes32 requestId) 
        external 
        validRequest(requestId) 
        onlyRequestOwner(requestId) 
        nonReentrant 
    {
        ConversionRequest storage request = conversionRequests[requestId];
        require(
            request.status == ConversionStatus.Pending || 
            request.status == ConversionStatus.Processing,
            "Cannot cancel completed request"
        );
        
        // Update status
        request.status = ConversionStatus.Cancelled;
        
        // Refund user (full amount if pending, minus fees if processing)
        uint256 refundAmount = request.status == ConversionStatus.Pending ? 
            request.amount : 
            request.amount - request.fees;
            
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
        
        // Pay fees to provider if processing
        if (request.status == ConversionStatus.Processing && request.fees > 0) {
            payable(request.assignedProvider).transfer(request.fees);
        }
        
        emit ConversionCancelled(requestId, msg.sender);
    }
    
    // ===========================================
    // PROVIDER MANAGEMENT
    // ===========================================
    
    /**
     * @dev Register new off-ramp provider
     * @param providerAddress Provider's address
     * @param name Provider name
     * @param supportedCurrencies Array of supported currencies
     * @param supportedCountries Array of supported countries
     * @param minAmount Minimum conversion amount
     * @param maxAmount Maximum conversion amount
     * @param feePercentage Fee percentage in basis points
     * @param fixedFee Fixed fee in wei
     */
    function addProvider(
        address providerAddress,
        string calldata name,
        string[] calldata supportedCurrencies,
        string[] calldata supportedCountries,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 feePercentage,
        uint256 fixedFee
    ) external onlyOwner {
        require(providerAddress != address(0), "Invalid provider address");
        require(providers[providerAddress].providerAddress == address(0), "Provider already exists");
        require(bytes(name).length > 0, "Provider name required");
        require(supportedCurrencies.length > 0, "Supported currencies required");
        require(minAmount < maxAmount, "Invalid amount range");
        require(feePercentage <= 1000, "Fee percentage too high"); // Max 10%
        
        // Create provider
        providers[providerAddress] = OffRampProvider({
            providerAddress: providerAddress,
            name: name,
            supportedCurrencies: supportedCurrencies,
            supportedCountries: supportedCountries,
            minAmount: minAmount,
            maxAmount: maxAmount,
            feePercentage: feePercentage,
            fixedFee: fixedFee,
            status: ProviderStatus.Active,
            totalProcessed: 0,
            successfulConversions: 0,
            failedConversions: 0
        });
        
        // Add to provider list
        providerList.push(providerAddress);
        
        // Add to currency mappings
        for (uint i = 0; i < supportedCurrencies.length; i++) {
            currencyProviders[supportedCurrencies[i]].push(providerAddress);
        }
        
        emit ProviderAdded(providerAddress, name);
    }
    
    /**
     * @dev Update provider status
     * @param providerAddress Provider address
     * @param status New status
     */
    function updateProviderStatus(
        address providerAddress,
        ProviderStatus status
    ) external onlyOwner {
        require(providers[providerAddress].providerAddress != address(0), "Provider doesn't exist");
        
        providers[providerAddress].status = status;
        
        emit ProviderUpdated(providerAddress, status);
    }
    
    // ===========================================
    // KYC MANAGEMENT
    // ===========================================
    
    /**
     * @dev Update user KYC status
     * @param user User address
     * @param isVerified KYC verification status
     * @param kycLevel KYC level (e.g., "basic", "enhanced")
     */
    function updateKYCStatus(
        address user,
        bool isVerified,
        string calldata kycLevel
    ) external onlyOperator {
        userProfiles[user].isKYCVerified = isVerified;
        userProfiles[user].kycLevel = kycLevel;
        
        emit KYCStatusUpdated(user, isVerified, kycLevel);
    }
    
    /**
     * @dev Blacklist/unblacklist user
     * @param user User address
     * @param blacklisted Blacklist status
     */
    function setUserBlacklist(address user, bool blacklisted) external onlyOwner {
        userProfiles[user].isBlacklisted = blacklisted;
    }
    
    // ===========================================
    // ADMIN FUNCTIONS
    // ===========================================
    
    /**
     * @dev Set authorized operator
     * @param operator Operator address
     * @param authorized Authorization status
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        authorizedOperators[operator] = authorized;
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Expire old requests (operator only)
     * @param requestId Request ID to expire
     */
    function expireRequest(bytes32 requestId) external onlyOperator validRequest(requestId) {
        ConversionRequest storage request = conversionRequests[requestId];
        require(
            request.status == ConversionStatus.Pending || 
            request.status == ConversionStatus.Processing,
            "Request already finalized"
        );
        require(
            block.timestamp > request.requestedAt + REQUEST_TIMEOUT,
            "Request not expired yet"
        );
        
        request.status = ConversionStatus.Expired;
        
        // Refund user
        payable(request.user).transfer(request.amount);
    }
    
    // ===========================================
    // VIEW FUNCTIONS
    // ===========================================
    
    /**
     * @dev Get conversion request details
     * @param requestId Request ID
     */
    function getConversionRequest(bytes32 requestId) external view returns (ConversionRequest memory) {
        return conversionRequests[requestId];
    }
    
    /**
     * @dev Get user's conversion requests
     * @param user User address
     */
    function getUserRequests(address user) external view returns (bytes32[] memory) {
        return userRequests[user];
    }
    
    /**
     * @dev Get providers supporting a currency
     * @param currency Currency code
     */
    function getProvidersForCurrency(string calldata currency) external view returns (address[] memory) {
        return currencyProviders[currency];
    }
    
    /**
     * @dev Get all providers
     */
    function getAllProviders() external view returns (address[] memory) {
        return providerList;
    }
    
    /**
     * @dev Get provider details
     * @param providerAddress Provider address
     */
    function getProvider(address providerAddress) external view returns (OffRampProvider memory) {
        return providers[providerAddress];
    }
    
    /**
     * @dev Get user profile
     * @param user User address
     */
    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }
    
    // ===========================================
    // INTERNAL FUNCTIONS
    // ===========================================
    
    /**
     * @dev Auto-assign provider to request
     * @param requestId Request ID
     */
    function _autoAssignProvider(bytes32 requestId) internal {
        ConversionRequest storage request = conversionRequests[requestId];
        
        // Try preferred provider first
        if (request.preferredProvider != address(0) && 
            providers[request.preferredProvider].status == ProviderStatus.Active &&
            _supportsConversion(request.preferredProvider, request.currency, request.amount)) {
            
            // Auto-assign preferred provider with default rates
            // In production, this would fetch real-time rates
            uint256 defaultRate = 2000 * 1e18; // Example: 1 ETH = 2000 USD
            uint256 fees = (request.amount * providers[request.preferredProvider].feePercentage) / 10000;
            
            request.assignedProvider = request.preferredProvider;
            request.exchangeRate = defaultRate;
            request.fiatAmount = (request.amount * defaultRate) / 1e18;
            request.fees = fees;
            request.status = ConversionStatus.Processing;
            request.processedAt = block.timestamp;
            
            emit ConversionAssigned(requestId, request.preferredProvider, defaultRate, request.fiatAmount, fees);
            emit ConversionProcessing(requestId, request.preferredProvider);
        }
    }
    
    /**
     * @dev Check if provider supports conversion
     * @param provider Provider address
     * @param currency Currency code
     * @param amount Conversion amount
     */
    function _supportsConversion(
        address provider,
        string memory currency,
        uint256 amount
    ) internal view returns (bool) {
        OffRampProvider memory p = providers[provider];
        
        // Check amount range
        if (amount < p.minAmount || amount > p.maxAmount) {
            return false;
        }
        
        // Check currency support
        for (uint i = 0; i < p.supportedCurrencies.length; i++) {
            if (keccak256(bytes(p.supportedCurrencies[i])) == keccak256(bytes(currency))) {
                return true;
            }
        }
        
        return false;
    }
}