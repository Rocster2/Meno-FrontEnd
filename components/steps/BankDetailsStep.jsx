'use client';

import { useState } from 'react';

/**
 * Step 5: Bank Details Collection Component
 */
export default function BankDetailsStep({ step, nft, stepData, isProcessing, error, onNext }) {
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [showMainnetPopup, setShowMainnetPopup] = useState(false);

  const stablecoinData = stepData[3]; // Stablecoin data from step 4

  const handleInputChange = (field, value) => {
    const newBankDetails = { ...bankDetails, [field]: value };
    setBankDetails(newBankDetails);
    
    // Clear validation error for this field
    const newErrors = { ...validationErrors };
    delete newErrors[field];
    setValidationErrors(newErrors);
    
    // Check if form is valid
    validateForm(newBankDetails);
  };

  const validateForm = (details = bankDetails) => {
    const errors = {};
    
    if (!details.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }
    
    if (!details.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required';
    } else if (details.accountNumber.length < 8) {
      errors.accountNumber = 'Account number must be at least 8 digits';
    } else if (!/^\d+$/.test(details.accountNumber)) {
      errors.accountNumber = 'Account number must contain only digits';
    }
    
    if (!details.accountName.trim()) {
      errors.accountName = 'Account name is required';
    } else if (details.accountName.length < 2) {
      errors.accountName = 'Account name must be at least 2 characters';
    }
    
    setValidationErrors(errors);
    const valid = Object.keys(errors).length === 0;
    setIsFormValid(valid);
    return valid;
  };

  const handleNext = () => {
    if (validateForm()) {
      // Show mainnet restriction popup instead of proceeding
      setShowMainnetPopup(true);
    }
  };

  const handleMainnetAcknowledge = () => {
    // Close the popup and complete the demo workflow
    setShowMainnetPopup(false);
    
    // This completes the demo - no need to proceed further
    // The user has seen the complete workflow and understands mainnet is required
    onNext({
      bankDetails,
      isValidated: true,
      submittedAt: new Date().toISOString(),
      mainnetRestrictionShown: true,
      workflowComplete: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="text-4xl mb-3">{step.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.name}</h3>
        <p className="text-gray-600">{step.description}</p>
      </div>

      {/* Conversion Message */}
      <div className="max-w-md mx-auto bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">💰</div>
        <h4 className="text-lg font-bold text-gray-900 mb-2">
          Your NFT would be converted to cash/fiat
        </h4>
        <p className="text-sm text-gray-700">
          You have {stablecoinData?.stablecoinAmount?.toFixed(2) || '3.33'} {stablecoinData?.stablecoinType || 'USDT'} ready to convert to cash in your bank account.
        </p>
      </div>

      {/* Bank Details Form */}
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="font-medium text-gray-900 mb-4">Bank Account Information</h4>
          
          <div className="space-y-4">
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name *
              </label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-gray-900 bg-white"
                placeholder="e.g., GTBank, Kuda Bank"
              />
              {validationErrors.bankName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.bankName}</p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number *
              </label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 font-mono text-gray-900 bg-white"
                placeholder="Enter your account number"
              />
              {validationErrors.accountNumber && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.accountNumber}</p>
              )}
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={bankDetails.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-gray-900 bg-white"
                placeholder="Full name as it appears on your account"
              />
              {validationErrors.accountName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.accountName}</p>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>• All fields are required</p>
            <p>• Account name must match your bank records</p>
            <p>• This information is encrypted and secure</p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-green-800">Secure & Encrypted</h4>
            <p className="text-sm text-green-700 mt-1">
              Your banking information is encrypted using bank-grade security and never stored in plain text. We comply with PCI DSS standards.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-800">Validation Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleNext}
          disabled={!isFormValid || isProcessing}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Validating...</span>
            </div>
          ) : (
            'Submit Bank Details'
          )}
        </button>
      </div>

      {/* Mainnet Restriction Popup */}
      {showMainnetPopup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform rounded-xl bg-white shadow-2xl">
              {/* Popup Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">⚠️</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Network Requirement</h3>
                    <p className="text-orange-100 text-sm">Action Required</p>
                  </div>
                </div>
              </div>

              {/* Popup Content */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    This feature is only available on mainnet, kindly switch to mainnet to off-ramp
                  </h4>
                  <p className="text-gray-600">
                    To complete the fiat conversion and receive funds in your bank account, 
                    you need to switch to Morph Mainnet.
                  </p>
                </div>

                {/* Network Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🧪</div>
                    <h5 className="font-medium text-red-800">Current Network</h5>
                    <p className="text-sm text-red-600">Morph Holesky Testnet</p>
                    <p className="text-xs text-red-500 mt-1">Demo Only</p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🌐</div>
                    <h5 className="font-medium text-green-800">Required Network</h5>
                    <p className="text-sm text-green-600">Morph Mainnet</p>
                    <p className="text-xs text-green-500 mt-1">Real Transactions</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleMainnetAcknowledge}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    I Understand
                  </button>
                  <button
                    onClick={() => window.open('https://docs.morphl2.io/docs/quick-start/wallet-setup', '_blank')}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Switch to Mainnet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}