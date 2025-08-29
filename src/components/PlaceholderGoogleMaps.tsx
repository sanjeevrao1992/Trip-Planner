import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// Temporary placeholder component for Google Maps integration
export function PlaceholderGoogleMaps() {
  return (
    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
      <Alert className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Google Maps integration placeholder. 
          Add your Google Maps API key to enable the map functionality.
        </AlertDescription>
      </Alert>
    </div>
  );
}