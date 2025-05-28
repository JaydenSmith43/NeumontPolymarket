import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import SignInModal from "./auth/SignInModal";

interface NavigationProps {
  balance: number;
}

const Navigation: React.FC<NavigationProps> = ({ balance: defaultBalance }) => {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  
  // Use the user's balance from profile if available, otherwise use the default balance
  const balance = profile?.balance ?? defaultBalance;
  
  return (
    <header className="bg-[#333333] py-4 px-6 shadow-md border-b-2 border-[#f1c40f]">
      <div className="flex justify-between items-center max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold m-0">
            NEUMONT <span className="text-[#f1c40f]">POLYMARKET</span>
          </h1>
          <div className="bg-[#222222] py-2 px-4 rounded flex items-center gap-2 shadow-md border border-[#f1c40f]">
            <span className="font-normal">Balance:</span>
            <span className="font-bold text-xl text-[#f1c40f] drop-shadow-sm">
              {balance}
            </span>
            <span className="opacity-70">NTC</span>
          </div>
        </div>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-[#f5f5f5] text-sm">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="text-[#f1c40f] hover:text-[#f1c40f]/80 transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSignInModalOpen(true)}
              className="text-[#f1c40f] hover:text-[#f1c40f]/80 transition-colors duration-200"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
      
      <SignInModal 
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </header>
  );
};

export default Navigation;
