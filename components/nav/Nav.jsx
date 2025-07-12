"use client";
import { useState } from "react";
import { useAccount } from 'wagmi'
import { Menu, X, Wallet, User } from "lucide-react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import LoginModal from "./LoginModal";
import { useModal } from "../../hooks/useModal";

export default function Nav() {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const { isOpen, openModal, closeModal } = useModal();
   const { address, isConnected } = useAccount();

   const formatAddress = (addr) => {
      if (!addr) return '';
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
   };

   return (
      <>
         <nav className="flex items-center justify-between w-full px-4 md:px-10 py-4 bg-neutral-950 border-b border-gray-800 z-50 relative">
            <Logo />

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-grow justify-center md:w-[40vw] xl_custom:w-[63vw]">
               <SearchBar />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
               <button
                  className={`hidden md:inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                     isConnected
                        ? 'bg-gray-800 hover:bg-gray-700 text-white'
                        : 'gradient-button text-black hover:scale-105'
                  }`}
                  onClick={openModal}>
                  {isConnected ? (
                     <>
                        <User className="w-4 h-4" />
                        <span>{formatAddress(address)}</span>
                     </>
                  ) : (
                     <>
                        <Wallet className="w-4 h-4" />
                        <span>Connect Wallet</span>
                     </>
                  )}
               </button>

               {/* Mobile Menu Toggle */}
               <button
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu">
                  {isMobileMenuOpen ? (
                     <X className="w-6 h-6" />
                  ) : (
                     <Menu className="w-6 h-6" />
                  )}
               </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
               <div className="absolute top-full left-0 right-0 bg-neutral-950 border-b border-gray-800 md:hidden z-40">
                  <div className="p-4 space-y-4">
                     <SearchBar />
                     <button
                        onClick={() => {
                           openModal();
                           setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                           isConnected
                              ? 'bg-gray-800 hover:bg-gray-700 text-white'
                              : 'gradient-button text-black'
                        }`}>
                        {isConnected ? (
                           <>
                              <User className="w-4 h-4" />
                              <span>{formatAddress(address)}</span>
                           </>
                        ) : (
                           <>
                              <Wallet className="w-4 h-4" />
                              <span>Connect Wallet</span>
                           </>
                        )}
                     </button>
                  </div>
               </div>
            )}
         </nav>

         <LoginModal isOpen={isOpen} onClose={closeModal} />
      </>
   );
}
