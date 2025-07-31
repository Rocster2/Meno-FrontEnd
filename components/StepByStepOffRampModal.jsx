'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';

/**
 * Professional Step-by-Step Off-ramp Modal Component
 * Demonstrates the complete NFT-to-cash workflow for hackathon judges
 */
export default function StepByStepOffRampModal({ nft, isOpen, onClose }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Step management state
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepData, setStepData] = useState({});
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Step definitions with corrected workflow
  const steps = [
    {
      id: 1,
      name: "Set Listing Price",
      icon: "💰",
      description: "Set the price for your NFT",
      component: "PriceSettingStep"
    },
    {
      id: 2,
      name: "List NFT on Marketplace",
      icon: "📝",
      description: "List your NFT for sale",
      component: "ListingStep"
    },
    {
      id: 3,
      name: "Process Sale",
      icon: "🤝",
      description: "Buyer purchases NFT, you receive ETH",
      component: "SaleProcessingStep"
    },
    {
      id: 4,
      name: "Bridge to Stablecoin",
      icon: "🌉",
      description: "Convert ETH to USDT/USDC",
      component: "StablecoinBridgeStep"
    },
    {
      id: 5,
      name: "Enter Bank Details",
      icon: "🏦",
      description: "Provide your bank account information",
      component: "BankDetailsStep"
    },
    {
      id: 6,
      name: "Conversion Confirmation",
      icon: "✅",
      description: "Confirm fiat conversion",
      component: "ConversionConfirmationStep"
    },
    {
      id: 7,
      name: "Mainnet Requirement",
      icon: "🔗",
      description: "Network requirement notice",
      component: "MainnetRestrictionStep"
    }
  ];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setStepData({});
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Handle step progression
  const handleNextStep = async (data = {}) => {
    console.log('Modal: handleNextStep called', { currentStep, data });
    setIsProcessing(true);
    setError(null);

    try {
      // Store step data
      const newStepData = { ...stepData, [currentStep]: data };
      setStepData(newStepData);

      // Simulate processing time for demo (shorter for step 3)
      const delay = currentStep === 2 ? 500 : 1500 + Math.random() * 1000; // Step 3 (index 2) gets shorter delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Move to next step
      if (currentStep < steps.length - 1) {
        console.log('Modal: Moving to next step', { from: currentStep, to: currentStep + 1 });
        setCurrentStep(currentStep + 1);
      } else {
        console.log('Modal: Already at last step');
      }
    } catch (err) {
      console.error('Step processing error:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-start processing for certain steps
  useEffect(() => {
    if ((currentStep === 1 || currentStep === 2) && !isProcessing) { // Step 2 (ListingStep) and Step 3 (SaleProcessingStep)
      setIsProcessing(true);
    }
  }, [currentStep]);

  // Handle going back to previous step
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl transform rounded-xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">NFT Off-ramp Process</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Convert your NFT to cash in your bank account
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* NFT Info */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-4">
                <img
                  src={nft?.image || '/placeholder-nft.png'}
                  alt={nft?.name || 'NFT'}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {nft?.realName || nft?.name || 'My NFT'}
                  </h3>
                  <p className="text-sm text-gray-600">Token #{nft?.tokenId}</p>
                  <p className="text-sm text-blue-600 font-medium">
                    Demo Price: 0.001 ETH
                  </p>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="mb-6">
              <StepContent
                step={currentStepData}
                stepIndex={currentStep}
                nft={nft}
                stepData={stepData}
                isProcessing={isProcessing}
                error={error}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
                sessionId={sessionId}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Session ID: {sessionId.slice(-8)}
              </div>
              <div className="flex space-x-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePreviousStep}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic Step Content Component
 */
function StepContent({ step, stepIndex, nft, stepData, isProcessing, error, onNext, onPrevious, sessionId }) {
  switch (step.component) {
    case 'PriceSettingStep':
      return (
        <PriceSettingStep
          step={step}
          nft={nft}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'ListingStep':
      return (
        <ListingStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'SaleProcessingStep':
      return (
        <SaleProcessingStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'StablecoinBridgeStep':
      return (
        <StablecoinBridgeStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'BankDetailsStep':
      return (
        <BankDetailsStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'ConversionConfirmationStep':
      return (
        <ConversionConfirmationStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    case 'MainnetRestrictionStep':
      return (
        <MainnetRestrictionStep
          step={step}
          nft={nft}
          stepData={stepData}
          isProcessing={isProcessing}
          error={error}
          onNext={onNext}
        />
      );
    default:
      return <div>Unknown step</div>;
  }
}

// Import step components
import PriceSettingStep from './steps/PriceSettingStep';
import ListingStep from './steps/ListingStep';
import SaleProcessingStep from './steps/SaleProcessingStep';
import StablecoinBridgeStep from './steps/StablecoinBridgeStep';
import BankDetailsStep from './steps/BankDetailsStep';
import ConversionConfirmationStep from './steps/ConversionConfirmationStep';
import MainnetRestrictionStep from './steps/MainnetRestrictionStep';