import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(email);
      if (error) {
        setError(error.message);
      } else {
        setIsSent(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 px-4">
      <div 
        className="bg-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full p-6 border border-[#f1c40f]/30"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">
            {isSent ? 'Check Your Email' : 'Sign In'}
          </h2>
          <button 
            onClick={onClose}
            className="text-[#f5f5f5]/60 hover:text-[#f5f5f5] transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {isSent ? (
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-[#f1c40f]/20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <p className="text-[#f5f5f5] mb-4">
              We've sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-[#f5f5f5]/70 text-sm mb-6">
              Click the link in the email to sign in to your account.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-[#f1c40f] text-[#222222] rounded font-medium hover:bg-[#f1c40f]/90 transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#f5f5f5] mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-3 py-2 bg-[#333333] border border-[#f1c40f]/30 rounded-md text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f1c40f]/60 focus:border-transparent"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-200">
                {error}
              </div>
            )}
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-2 px-4 bg-[#f1c40f] text-[#222222] rounded font-medium hover:bg-[#f1c40f]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
            
            <p className="text-center text-[#f5f5f5]/50 text-sm mt-4">
              No password needed! We'll send you a magic link to sign in instantly.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}