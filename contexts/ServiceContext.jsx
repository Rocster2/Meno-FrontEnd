'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import TransactionManager from '../lib/services/TransactionManager'
import PaycrestService from '../lib/services/PaycrestService'
import SyncManager from '../lib/services/SyncManager'
import TransactionProcessor from '../lib/services/TransactionProcessor'
import NotificationService from '../lib/services/NotificationService'
import ComplianceService from '../lib/services/ComplianceService'
import EventListenerService from '../lib/services/EventListenerService'
import NFTDetectionService from '../lib/services/NFTDetectionService'

// Create the context
const ServiceContext = createContext(null)

/**
 * Service Provider Component
 * Provides integrated service management with real implementations
 */
export function ServiceProvider({ children }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [services, setServices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setLoading(true)
        setError(null)

        // Initialize core services
        const transactionManager = new TransactionManager()
        const paycrestService = new PaycrestService()
        const notificationService = new NotificationService()
        const complianceService = new ComplianceService()
        const eventListenerService = new EventListenerService()
        const nftDetectionService = new NFTDetectionService()
        
        // Initialize services that depend on other services
        const syncManager = new SyncManager(eventListenerService, notificationService)
        const transactionProcessor = new TransactionProcessor(
          paycrestService,
          complianceService,
          notificationService
        )

        // Initialize wallet client if available
        if (walletClient && isConnected) {
          await transactionManager.initializeWalletClient(walletClient)
        }

        const serviceInstances = {
          transactionManager,
          paycrestService,
          syncManager,
          transactionProcessor,
          notificationService,
          complianceService,
          eventListenerService,
          nftDetectionService
        }

        setServices(serviceInstances)
        console.log('✅ Services initialized successfully')

      } catch (err) {
        console.error('❌ Failed to initialize services:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeServices()
  }, [walletClient, isConnected])

  // Update wallet client when it changes
  useEffect(() => {
    if (services?.transactionManager && walletClient && isConnected) {
      services.transactionManager.initializeWalletClient(walletClient)
    }
  }, [services, walletClient, isConnected])

  const reinitialize = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Re-initialize services
      const initializeServices = async () => {
        const transactionManager = new TransactionManager()
        const paycrestService = new PaycrestService()
        const notificationService = new NotificationService()
        const complianceService = new ComplianceService()
        const eventListenerService = new EventListenerService()
        const nftDetectionService = new NFTDetectionService()
        
        const syncManager = new SyncManager(eventListenerService, notificationService)
        const transactionProcessor = new TransactionProcessor(
          paycrestService,
          complianceService,
          notificationService
        )

        if (walletClient && isConnected) {
          await transactionManager.initializeWalletClient(walletClient)
        }

        return {
          transactionManager,
          paycrestService,
          syncManager,
          transactionProcessor,
          notificationService,
          complianceService,
          eventListenerService,
          nftDetectionService
        }
      }

      const newServices = await initializeServices()
      setServices(newServices)
      console.log('✅ Services reinitialized successfully')
      
    } catch (err) {
      console.error('❌ Failed to reinitialize services:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const contextValue = {
    services,
    loading,
    error,
    reinitialize,
    isConnected,
    userAddress: address
  }

  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  )
}

/**
 * Hook to use services
 */
export function useServices() {
  const context = useContext(ServiceContext)
  
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider')
  }
  
  return context
}

/**
 * Hook to use a specific service
 */
export function useService(serviceName) {
  const { services, loading, error } = useServices()
  
  return {
    service: services?.[serviceName] || null,
    loading,
    error
  }
}

export default ServiceContext