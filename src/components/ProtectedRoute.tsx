import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;

  // If KYC not complete, redirect to onboarding
  if (profile && profile.kyc_status !== 'approved') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
