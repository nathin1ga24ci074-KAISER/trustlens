import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut, LayoutDashboard, History, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 group-hover:border-sky-500 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
              TrustLens
              <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 uppercase">
                v0.1
              </span>
            </span>
            <span className="text-[11px] text-slate-400 -mt-0.5 font-normal">
              Misinformation Verification Platform
            </span>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/') ? 'text-sky-400 bg-sky-950/40' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            Overview
          </Link>
          {user && (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/dashboard') ? 'text-sky-400 bg-sky-950/40' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/history"
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/history') ? 'text-sky-400 bg-sky-950/40' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                Verification History
              </Link>
            </>
          )}
        </nav>

        {/* Right Action / Auth State */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-medium">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({user.email})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" leftIcon={<UserCheck className="w-3.5 h-3.5" />}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
