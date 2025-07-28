const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Test Runner for Meno NFT Off-ramp Platform
 * Executes all test suites and generates detailed reports
 */

class TestRunner {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: {},
      gasUsage: {},
      executionTime: 0
    };
    
    this.testSuites = [
      {
        name: 'MenoMarketplace Core Tests',
        file: 'test/MenoMarketplace.test.js',
        description: 'Core marketplace functionality tests'
      },
      {
        name: 'FiatOffRamp Core Tests',
        file: 'test/FiatOffRamp.test.js',
        description: 'Fiat off-ramp functionality tests'
      },
      {
        name: 'Security Tests',
        file: 'test/MenoMarketplace.security.test.js',
        description: 'Security vulnerability and access control tests'
      },
      {
        name: 'Gas Optimization Tests',
        file: 'test/GasOptimization.test.js',
        description: 'Gas usage optimization and efficiency tests'
      },
      {
        name: 'Deployment Tests',
        file: 'test/deployment.test.js',
        description: 'Contract deployment and configuration tests'
      }
    ];
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite for Meno NFT Off-ramp Platform');
    console.log('=' .repeat(80));
    
    const startTime = Date.now();
    
    try {
      // Check if Hardhat is available
      this.checkHardhatSetup();
      
      // Compile contracts first
      await this.compileContracts();
      
      // Run individual test suites
      for (const suite of this.testSuites) {
        await this.runTestSuite(suite);
      }
      
      // Generate coverage report
      await this.generateCoverageReport();
      
      // Generate final report
      this.testResults.executionTime = Date.now() - startTime;
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check Hardhat setup
   */
  checkHardhatSetup() {
    console.log('🔧 Checking Hardhat setup...');
    
    try {
      execSync('npx hardhat --version', { stdio: 'pipe' });
      console.log('✅ Hardhat is available');
    } catch (error) {
      throw new Error('Hardhat is not installed or configured properly');
    }
    
    // Check if hardhat.config.js exists
    if (!fs.existsSync('hardhat.config.js')) {
      throw new Error('hardhat.config.js not found');
    }
    
    console.log('✅ Hardhat configuration found');
  }

  /**
   * Compile contracts
   */
  async compileContracts() {
    console.log('🔨 Compiling smart contracts...');
    
    try {
      execSync('npx hardhat compile', { stdio: 'inherit' });
      console.log('✅ Contracts compiled successfully');
    } catch (error) {
      throw new Error('Contract compilation failed');
    }
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    console.log(`\n📋 Running ${suite.name}...`);
    console.log(`Description: ${suite.description}`);
    console.log('-'.repeat(60));
    
    try {
      const output = execSync(`npx hardhat test ${suite.file}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse test results
      const results = this.parseTestOutput(output);
      this.updateTestResults(results);
      
      console.log(`✅ ${suite.name} completed`);
      console.log(`   Tests: ${results.passed}/${results.total} passed`);
      
      if (results.failed > 0) {
        console.log(`   ⚠️  ${results.failed} tests failed`);
      }
      
    } catch (error) {
      console.log(`❌ ${suite.name} failed`);
      console.log(`   Error: ${error.message}`);
      
      // Continue with other tests even if one fails
      this.testResults.failed += 1;
    }
  }

  /**
   * Parse test output to extract results
   */
  parseTestOutput(output) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    // Extract test counts from Hardhat/Mocha output
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    const skippedMatch = output.match(/(\d+) pending/);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    if (skippedMatch) results.skipped = parseInt(skippedMatch[1]);
    
    results.total = results.passed + results.failed + results.skipped;
    
    return results;
  }

  /**
   * Update overall test results
   */
  updateTestResults(results) {
    this.testResults.total += results.total;
    this.testResults.passed += results.passed;
    this.testResults.failed += results.failed;
    this.testResults.skipped += results.skipped;
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    console.log('\n📊 Generating coverage report...');
    
    try {
      // Run coverage analysis
      const coverageOutput = execSync('npx hardhat coverage', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse coverage data
      this.parseCoverageOutput(coverageOutput);
      
      console.log('✅ Coverage report generated');
      
    } catch (error) {
      console.log('⚠️  Coverage report generation failed:', error.message);
    }
  }

  /**
   * Parse coverage output
   */
  parseCoverageOutput(output) {
    // Extract coverage percentages
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('All files')) {
        const match = line.match(/(\d+\.?\d*)/g);
        if (match && match.length >= 4) {
          this.testResults.coverage = {
            statements: parseFloat(match[0]),
            branches: parseFloat(match[1]),
            functions: parseFloat(match[2]),
            lines: parseFloat(match[3])
          };
        }
        break;
      }
    }
  }

  /**
   * Generate final test report
   */
  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(80));
    
    // Test Results Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`   Total Tests: ${this.testResults.total}`);
    console.log(`   ✅ Passed: ${this.testResults.passed}`);
    console.log(`   ❌ Failed: ${this.testResults.failed}`);
    console.log(`   ⏭️  Skipped: ${this.testResults.skipped}`);
    
    const successRate = this.testResults.total > 0 
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(2)
      : 0;
    console.log(`   📈 Success Rate: ${successRate}%`);
    
    // Coverage Report
    if (Object.keys(this.testResults.coverage).length > 0) {
      console.log('\n📊 Code Coverage:');
      console.log(`   Statements: ${this.testResults.coverage.statements}%`);
      console.log(`   Branches: ${this.testResults.coverage.branches}%`);
      console.log(`   Functions: ${this.testResults.coverage.functions}%`);
      console.log(`   Lines: ${this.testResults.coverage.lines}%`);
    }
    
    // Execution Time
    console.log(`\n⏱️  Total Execution Time: ${(this.testResults.executionTime / 1000).toFixed(2)}s`);
    
    // Test Suite Breakdown
    console.log('\n📋 Test Suite Breakdown:');
    this.testSuites.forEach((suite, index) => {
      console.log(`   ${index + 1}. ${suite.name}`);
      console.log(`      ${suite.description}`);
    });
    
    // Recommendations
    this.generateRecommendations();
    
    // Save report to file
    this.saveReportToFile();
    
    console.log('\n' + '='.repeat(80));
    
    // Exit with appropriate code
    if (this.testResults.failed > 0) {
      console.log('❌ Some tests failed. Please review and fix issues.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    }
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    console.log('\n💡 Recommendations:');
    
    if (this.testResults.failed > 0) {
      console.log('   🔧 Fix failing tests before deployment');
    }
    
    if (this.testResults.coverage.statements < 90) {
      console.log('   📈 Increase test coverage to at least 90%');
    }
    
    if (this.testResults.coverage.branches < 80) {
      console.log('   🌿 Add more branch coverage tests');
    }
    
    console.log('   🔒 Run security audit before mainnet deployment');
    console.log('   ⛽ Monitor gas usage in production');
    console.log('   📊 Set up continuous integration for automated testing');
  }

  /**
   * Save report to file
   */
  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.testResults,
      testSuites: this.testSuites,
      recommendations: [
        'Fix any failing tests before deployment',
        'Maintain test coverage above 90%',
        'Run security audit before mainnet deployment',
        'Monitor gas usage in production',
        'Set up continuous integration'
      ]
    };
    
    const reportPath = path.join(__dirname, '..', 'test-reports', `test-report-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Run specific test suite
   */
  async runSpecificTest(testName) {
    const suite = this.testSuites.find(s => 
      s.name.toLowerCase().includes(testName.toLowerCase()) ||
      s.file.includes(testName)
    );
    
    if (!suite) {
      console.log(`❌ Test suite '${testName}' not found`);
      console.log('Available test suites:');
      this.testSuites.forEach(s => console.log(`   - ${s.name}`));
      return;
    }
    
    console.log(`🚀 Running specific test: ${suite.name}`);
    await this.runTestSuite(suite);
    
    console.log('\n📋 Test completed');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();
  
  if (args.length === 0) {
    // Run all tests
    await testRunner.runAllTests();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Meno Test Runner');
    console.log('Usage:');
    console.log('  node scripts/run-tests.js              # Run all tests');
    console.log('  node scripts/run-tests.js [test-name]  # Run specific test');
    console.log('  node scripts/run-tests.js --help       # Show this help');
    console.log('');
    console.log('Available tests:');
    testRunner.testSuites.forEach(suite => {
      console.log(`  - ${suite.name}`);
    });
  } else {
    // Run specific test
    await testRunner.runSpecificTest(args[0]);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test runner
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = TestRunner;