# Meno NFT Off-ramp Platform - Testing Framework

This directory contains comprehensive test suites for the Meno NFT off-ramp platform smart contracts and system components.

## Test Structure

### Core Test Files

1. **MenoMarketplace.test.js** - Core marketplace functionality tests
   - NFT listing and purchasing
   - Price updates and listing management
   - Cross-platform synchronization
   - Admin functions and seller operations

2. **FiatOffRamp.test.js** - Fiat off-ramp functionality tests
   - Provider management and registration
   - KYC/AML compliance integration
   - Conversion request lifecycle
   - Provider assignment and completion

3. **MenoMarketplace.security.test.js** - Security and vulnerability tests
   - Reentrancy protection
   - Access control verification
   - Input validation
   - State consistency checks
   - Integer overflow/underflow protection
   - Time-based vulnerabilities

4. **GasOptimization.test.js** - Gas usage optimization tests
   - Gas efficiency measurements
   - Batch operation optimization
   - Storage optimization verification
   - Event emission efficiency
   - Gas usage comparisons

5. **deployment.test.js** - Contract deployment and configuration tests
   - Multi-network deployment verification
   - Post-deployment configuration
   - End-to-end functionality testing
   - Contract verification preparation
   - Security checks for deployed contracts

## Test Categories

### 🔒 Security Tests
- **Reentrancy Protection**: Prevents malicious contracts from exploiting reentrancy vulnerabilities
- **Access Control**: Ensures only authorized users can call restricted functions
- **Input Validation**: Validates all user inputs and prevents invalid operations
- **State Consistency**: Maintains consistent contract state during concurrent operations
- **Overflow Protection**: Handles large numbers safely without overflow/underflow

### ⛽ Gas Optimization Tests
- **Function Efficiency**: Measures gas usage for core functions
- **Batch Operations**: Tests gas efficiency for multiple operations
- **Storage Optimization**: Verifies efficient data storage patterns
- **Event Optimization**: Ensures minimal gas overhead for events

### 🚀 Deployment Tests
- **Network Compatibility**: Tests deployment on different networks (testnet/mainnet)
- **Configuration Verification**: Ensures proper post-deployment setup
- **Integration Testing**: Validates end-to-end functionality after deployment

## Running Tests

### Run All Tests
```bash
npm run test:all
```

### Run Specific Test Suites
```bash
# Core marketplace tests
npm run test:marketplace

# Fiat off-ramp tests
npm run test:fiat

# Security tests
npm run test:security

# Gas optimization tests
npm run test:gas

# Deployment tests
npm run test:deployment
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run Individual Test Files
```bash
# Using Hardhat directly
npx hardhat test test/MenoMarketplace.test.js
npx hardhat test test/FiatOffRamp.test.js
```

## Test Coverage Goals

- **Statements**: > 90%
- **Branches**: > 80%
- **Functions**: > 95%
- **Lines**: > 90%

## Security Test Coverage

### Reentrancy Protection
- ✅ buyNFT function protected against reentrancy
- ✅ withdrawProceeds function protected against reentrancy
- ✅ Malicious contract attack prevention

### Access Control
- ✅ Owner-only functions properly restricted
- ✅ Seller-only operations validated
- ✅ Authorized marketplace verification
- ✅ Operator permissions enforced

### Input Validation
- ✅ Price validation (non-zero, reasonable limits)
- ✅ Duration validation (within allowed ranges)
- ✅ Address validation (non-zero addresses)
- ✅ Amount validation (within conversion limits)

### State Consistency
- ✅ Listing state updates atomic
- ✅ Double-spending prevention
- ✅ NFT ownership transfer verification
- ✅ Proceeds calculation accuracy

## Gas Optimization Results

### MenoMarketplace Gas Usage
- **NFT Listing**: < 200,000 gas
- **NFT Purchase**: < 150,000 gas
- **Price Update**: < 50,000 gas
- **Listing Cancellation**: < 40,000 gas

### FiatOffRamp Gas Usage
- **Provider Registration**: < 300,000 gas
- **Conversion Request**: < 200,000 gas
- **Provider Assignment**: < 100,000 gas
- **Conversion Completion**: < 80,000 gas

## Test Environment Setup

### Prerequisites
- Node.js >= 16.0.0
- Hardhat development environment
- OpenZeppelin contracts
- Chai testing framework

### Network Configuration
Tests are configured to run on:
- **Local Hardhat Network** (default)
- **Morph Holesky Testnet** (Chain ID: 2810)
- **Morph Mainnet** (Chain ID: 2818)

### Mock Contracts
- **MockERC721**: Test NFT contract for marketplace testing
- **MaliciousBuyer**: Contract for reentrancy attack testing
- **MaliciousWithdrawer**: Contract for withdrawal reentrancy testing

## Continuous Integration

### Automated Testing
- All tests run automatically on code changes
- Coverage reports generated for each test run
- Gas usage tracked and reported
- Security vulnerabilities flagged

### Quality Gates
- Minimum 90% test coverage required
- All security tests must pass
- Gas usage within acceptable limits
- No critical vulnerabilities detected

## Test Data and Fixtures

### Test Fixtures
- **deployMarketplaceFixture**: Sets up marketplace with mock NFTs
- **deployFiatOffRampFixture**: Sets up off-ramp with test providers
- **deployAllContractsFixture**: Complete system deployment

### Test Data
- Mock NFT collections with metadata
- Test user accounts with different KYC levels
- Sample off-ramp providers with various configurations
- Realistic transaction scenarios

## Reporting

### Test Reports
- Detailed test execution reports saved to `test-reports/`
- Coverage reports in HTML format
- Gas usage analysis and optimization recommendations
- Security audit summaries

### Report Format
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "results": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "coverage": {
      "statements": 92.5,
      "branches": 85.2,
      "functions": 96.8,
      "lines": 91.3
    }
  },
  "recommendations": [
    "Fix failing tests before deployment",
    "Increase branch coverage to 90%",
    "Run security audit before mainnet"
  ]
}
```

## Best Practices

### Writing Tests
1. Use descriptive test names that explain the expected behavior
2. Group related tests in describe blocks
3. Use fixtures for consistent test setup
4. Test both success and failure scenarios
5. Include edge cases and boundary conditions

### Security Testing
1. Test all access control mechanisms
2. Verify input validation for all functions
3. Check for reentrancy vulnerabilities
4. Validate state consistency after operations
5. Test with malicious contract interactions

### Gas Optimization
1. Measure gas usage for all functions
2. Compare gas costs between different implementations
3. Test batch operations for efficiency
4. Verify storage optimization techniques
5. Monitor gas usage trends over time

## Troubleshooting

### Common Issues
- **Contract compilation errors**: Run `npm run compile` first
- **Network connection issues**: Check RPC endpoints in hardhat.config.js
- **Test timeouts**: Increase timeout values for complex operations
- **Coverage generation fails**: Ensure all dependencies are installed

### Debug Commands
```bash
# Compile contracts with detailed output
npx hardhat compile --verbose

# Run tests with detailed gas reporting
npx hardhat test --gas-reporter

# Clean and rebuild
npm run clean && npm run compile
```

## Contributing

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add appropriate fixtures and test data
4. Update this README with new test descriptions
5. Ensure all tests pass before submitting

### Test Review Checklist
- [ ] Tests cover all new functionality
- [ ] Security implications considered
- [ ] Gas usage measured and optimized
- [ ] Edge cases included
- [ ] Documentation updated

---

For more information about the Meno NFT off-ramp platform, see the main project documentation.