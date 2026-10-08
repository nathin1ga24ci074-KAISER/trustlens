import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center py-10">
        <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-xs text-slate-400 mb-6">
          The requested route does not exist on the TrustLens platform.
        </p>
        <Link to="/">
          <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
            Back to Home
          </Button>
        </Link>
      </Card>
    </div>
  );
};
