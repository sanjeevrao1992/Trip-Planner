import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  types?: string[]; // e.g., ['(cities)'] or ['establishment']
  value?: string;
  onChange?: (value: string) => void;
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Search for a place...",
  className,
  types = ['establishment'],
  value,
  onChange
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value || '');

  // Temporary placeholder - will be replaced when Google Maps API is added
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Temporary mock place selection for development
      const mockPlace: PlaceResult = {
        place_id: 'mock_' + Date.now(),
        name: inputValue.trim(),
        formatted_address: inputValue.trim()
      };
      onPlaceSelect(mockPlace);
    }
  };

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <div>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder + " (Press Enter to select)"}
        className={cn(className)}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Temporary: Type city name and press Enter. Google Places will be integrated later.
      </p>
    </div>
  );
}

// Helper function to load Google Maps API
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps API'));
    
    document.head.appendChild(script);
  });
}