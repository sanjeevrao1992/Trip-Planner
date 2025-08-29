import { useEffect, useState } from 'react';

// Hook for managing anonymous user sessions via localStorage
export function useAnonymousSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get or create anonymous session ID
    let anonymousSessionId = localStorage.getItem('trip_pals_anonymous_session');
    
    if (!anonymousSessionId) {
      // Generate a random session ID
      anonymousSessionId = 'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
      localStorage.setItem('trip_pals_anonymous_session', anonymousSessionId);
    }
    
    setSessionId(anonymousSessionId);
  }, []);

  return sessionId;
}