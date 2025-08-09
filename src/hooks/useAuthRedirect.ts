import { useEffect, useState, useRef } from 'react';
import { useAuth0, Auth0ContextInterface } from '@auth0/auth0-react';
import { useIonRouter } from '@ionic/react';

// Helper to log auth state changes
const logAuthState = (auth: Auth0ContextInterface) => {
  console.group('Auth State');
  console.log('isAuthenticated:', auth.isAuthenticated);
  console.log('isLoading:', auth.isLoading);
  console.log('error:', auth.error);
  console.log('user:', auth.user);
  // Can't use 'await' here; log a placeholder or handle asynchronously below
  console.log('hasValidToken: checking...');
  
  // Try to get token info if available
  try {
    // Check if getAccessTokenSilently exists and is a function
    if (typeof auth.getAccessTokenSilently === 'function') {
      auth.getAccessTokenSilently().then(
        token => console.log('Token available, length:', token?.length || 0),
        err => console.log('Error getting token:', err)
      );
    } else {
      console.log('getAccessTokenSilently not available');
    }
  } catch (error) {
    console.error('Error checking token:', error);
  }
  
  console.groupEnd();
};

export const useAuthRedirect = () => {
  const auth = useAuth0();
  const router = useIonRouter();
  const prevAuthState = useRef<{
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | undefined;
  } | null>(null);
  
  const [lastRedirect, setLastRedirect] = useState<number>(0);
  
  // Log all auth state changes
  useEffect(() => {
    if (prevAuthState.current === null || 
        prevAuthState.current.isAuthenticated !== auth.isAuthenticated ||
        prevAuthState.current.isLoading !== auth.isLoading ||
        prevAuthState.current.error !== auth.error) {
      
      console.log('\n=== Auth State Changed ===');
      logAuthState(auth);
      
      // Update previous state
      prevAuthState.current = {
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        error: auth.error
      };
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error]);

  // Handle redirects based on auth state
  useEffect(() => {
    console.log('\n=== useAuthRedirect Effect ===');
    console.log('Current path:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Hash:', window.location.hash);
    
    // Skip if still loading
    if (auth.isLoading) {
      console.log('Auth still loading, skipping redirect check');
      return;
    }
    
    // Prevent multiple redirects in quick succession
    const now = Date.now();
    if (now - lastRedirect < 1000) {
      console.log('Redirect throttled, too soon since last redirect');
      return;
    }
    
    setLastRedirect(now);
    
    if (auth.isAuthenticated) {
      console.log('User is authenticated, checking if we need to redirect...');
      
      // If we're on the login page or root, redirect to /app
      if (window.location.pathname === '/' || window.location.pathname === '') {
        console.log('Redirecting to /app');
        router.push('/app', 'root', 'replace');
      }
    } else {
      console.log('User is not authenticated');
      
      // If we're not on the login page, redirect to login
      if (window.location.pathname !== '/') {
        console.log('Redirecting to login');
        router.push('/', 'root', 'replace');
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error, router, lastRedirect]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    user: auth.user
  };
};
