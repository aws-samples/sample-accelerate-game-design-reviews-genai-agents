import { useAuth as useAuthContext } from '../contexts/AuthContext';

// Re-export the useAuth hook from context for convenience
// This allows for future extension of auth-related hooks
export const useAuth = useAuthContext;