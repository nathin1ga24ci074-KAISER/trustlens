import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Verifying Authentication State...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated user to /login with intended return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
