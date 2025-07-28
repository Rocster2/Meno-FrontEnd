"use client";
import { useState } from "react";
import NFTCard from "./NFTCard";
import Toggle from "./Toggle";
import Pagination from "./Pagination";
import NFTListingForm from "./NFTListingForm";
import { collectionRankingData } from "../data/CollectionRankingData";

export default function NFTGrid({ userNFTs = [], showUserNFTs = false }) {
   const [activeFilter, setActiveFilter] = useState("All");
   const [showFiat, setShowFiat] = useState(false);
   const [activeTimeFilter, setActiveTimeFilter] = useState("1D");
   const [currentPage, setCurrentPage] = useState(1);
   const [selectedNFT, setSelectedNFT] = useState(null);
   const [showListingForm, setShowListingForm] = useState(false);

   const filters = ["All", "Top", "Rare"];
   const timeFilters = ["6h", "12h", "1D", "7D", "30D"];
   const itemsPerPage = 6;

   // Handle NFT listing
   const handleListNFT = (nft) => {
      setSelectedNFT(nft);
      setShowListingForm(true);
   };

   const closeListingForm = () => {
      setShowListingForm(false);
      setSelectedNFT(null);
   };

   const handleListingSuccess = (result) => {
      console.log('NFT listed successfully:', result);
      // You could show a success notification here
      // or refresh the NFT data to show the new listing status
   };

   // Use user NFTs if showing user's collection, otherwise use featured collections
   const dataToDisplay = showUserNFTs ? userNFTs : collectionRankingData
      .slice(0, 6)
      .map((item) => ({
         id: item.id,
         name: item.name,
         image: item.image,
         floorPrice: item.floor,
         change24h: item.volumeChange,
         verified: item.verified,
         category: item.category,
         volume: item.volume,
         // Add NFT-specific properties for listing
         contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
         tokenId: item.id.toString(),
         owner: '0x1234...5678', // This would come from wallet connection
         attributes: [
            { trait_type: 'Rarity', value: item.category },
            { trait_type: 'Volume', value: item.volume }
         ]
      }));

   const filteredCollections = dataToDisplay.filter((collection) => {
      if (activeFilter === "All") return true;
      return collection.category === activeFilter.toLowerCase();
   });

   const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
   const startIndex = (currentPage - 1) * itemsPerPage;
   const displayedCollections = filteredCollections.slice(
      startIndex,
      startIndex + itemsPerPage
   );

   return (
      <>
         <section className="px-4 md:px-6 lg:px-12 py-16 bg-black">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
               <h2 className="text-white text-3xl pixel-text font-bold tracking-wider">
                  {showUserNFTs ? "YOUR NFTs" : "FEATURED"}
               </h2>
               {showUserNFTs && (
                  <div className="text-white text-sm">
                     {userNFTs.length} NFT{userNFTs.length !== 1 ? 's' : ''} found
                  </div>
               )}
            </div>

            {/* Filters (only show for featured collections) */}
            {!showUserNFTs && (
               <div className="mb-6 flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2">
                     {filters.map((filter) => (
                        <button
                           key={filter}
                           onClick={() => setActiveFilter(filter)}
                           className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              activeFilter === filter
                                 ? "bg-blue-600 text-white"
                                 : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                           }`}
                        >
                           {filter}
                        </button>
                     ))}
                  </div>
                  <Toggle
                     label="Show Fiat Prices"
                     checked={showFiat}
                     onChange={setShowFiat}
                  />
               </div>
            )}

            {/* NFT Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
               {displayedCollections.map((collection) => (
                  <div key={collection.id} className="relative group">
                     <NFTCard
                        collection={collection}
                        showFiat={showFiat}
                     />
                     {/* List NFT Button for user's NFTs */}
                     {showUserNFTs && (
                        <button
                           onClick={() => handleListNFT(collection)}
                           className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           List for Sale
                        </button>
                     )}
                  </div>
               ))}
            </div>

            {/* Empty state for user NFTs */}
            {showUserNFTs && displayedCollections.length === 0 && (
               <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🖼️</div>
                  <h3 className="text-lg font-medium text-white mb-2">No NFTs found</h3>
                  <p className="text-gray-400">Connect your wallet to see your NFT collection</p>
               </div>
            )}

            {/* Pagination */}
            {displayedCollections.length > 0 && (
               <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
               />
            )}
         </section>

         {/* NFT Listing Form Modal */}
         <NFTListingForm
            nft={selectedNFT}
            isOpen={showListingForm}
            onClose={closeListingForm}
            onSuccess={handleListingSuccess}
         />
      </>
   );
}
