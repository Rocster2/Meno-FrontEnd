import "./globals.css";
import Web3Provider from '../components/Web3Provider';
import { ServiceProvider } from '../contexts/ServiceContext';
import TransactionStatusIndicator from '../components/TransactionStatusIndicator';

export const metadata = {
   title: "Meno - NFT Marketplace",
   description: "Off-ramp NFT to Fiat seamlessly on Morph Layer 2",
};

export default function RootLayout({ children }) {
   return (
      <html lang="en">
         <body className="bg-neutral text-white">
            <Web3Provider>
               <ServiceProvider>
                  {children}
                  <TransactionStatusIndicator />
               </ServiceProvider>
            </Web3Provider>
         </body>
      </html>
   );
}
