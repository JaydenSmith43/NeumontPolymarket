import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileFetchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchProfile = async (userId: string) => {
    console.log("=== fetchProfile start ===");
    try {
      console.log("Fetching profile for user:", userId);
      
      // Add a timeout to the fetch
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result as { 
        data: UserProfile | null; 
        error: { code?: string; message: string } | null 
      };
      
      console.log("Profile fetch result:", { data, error });
      
      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log("Profile doesn't exist, creating one...");
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              balance: 1000, // Starting balance
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          console.log("Profile creation result:", { newProfile, insertError });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }

          console.log("Profile created:", newProfile);
          setProfile(newProfile as UserProfile);
          return;
        }
        
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log("Profile fetched:", data);
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      throw error;
    } finally {
      console.log("=== fetchProfile end ===");
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log("=== AuthProvider useEffect start ===");

    const initializeAuth = async () => {
      console.log("=== initializeAuth start ===");
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session:", session);
        
        if (!mounted) {
          console.log("Component unmounted, returning");
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log("Setting isLoading to false in initializeAuth");
          setIsLoading(false);
        }
      }
      console.log("=== initializeAuth end ===");
    };

    // Initialize auth state
    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("=== onAuthStateChange start ===");
        console.log("Auth state changed:", _event, session);
        
        if (!mounted) {
          console.log("Component unmounted, returning");
          return;
        }
        
        try {
          // First update session and user
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Clear any existing timeout
            if (profileFetchTimeoutRef.current) {
              clearTimeout(profileFetchTimeoutRef.current);
            }

            // Debounce the profile fetch
            profileFetchTimeoutRef.current = setTimeout(async () => {
              try {
                await fetchProfile(session.user.id);
              } catch (error) {
                console.error('Error fetching profile:', error);
                // Even if profile fetch fails, we should still have a session
                setProfile(null);
              }
            }, 1000); // Wait 1 second before fetching profile
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          // On error, clear all states
          setSession(null);
          setUser(null);
          setProfile(null);
        } finally {
          if (mounted) {
            console.log("Setting isLoading to false in onAuthStateChange");
            setIsLoading(false);
          }
        }
        console.log("=== onAuthStateChange end ===");
      }
    );

    return () => {
      console.log("=== AuthProvider cleanup ===");
      mounted = false;
      if (profileFetchTimeoutRef.current) {
        clearTimeout(profileFetchTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

