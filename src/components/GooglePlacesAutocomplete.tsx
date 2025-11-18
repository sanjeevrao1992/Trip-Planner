import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Get API key and load Google Maps
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-api-key');
        if (error) throw error;
        
        const { apiKey: key } = data;
        setApiKey(key);
        
        if (key) {
          await loadGoogleMapsAPI(key);
          setIsGoogleMapsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
    };

    initializeGoogleMaps();
  }, []);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && inputRef.current && window.google) {
      const container = inputRef.current.parentElement;
      if (!container) return;

      // Check if the new PlaceAutocompleteElement is available
      const PlaceAutocompleteElement = (window.google.maps.places as any).PlaceAutocompleteElement;
      
      if (PlaceAutocompleteElement) {
        console.log('✅ Using new PlaceAutocompleteElement');
        
        try {
          // Create the new PlaceAutocompleteElement
          const autocompleteElement = new PlaceAutocompleteElement({
            componentRestrictions: types.includes('(cities)') ? { country: [] } : undefined,
          }) as HTMLElement;

          // Style the autocomplete element to match our input
          autocompleteElement.style.width = '100%';
          
          // Hide the original input and show the autocomplete element
          inputRef.current.style.display = 'none';
          container.insertBefore(autocompleteElement, inputRef.current);

          // Listen for place selection - using 'gmp-placeselect' event
          autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
            console.log('🎯 Place selected (new API), full event:', event);
            console.log('🎯 Event.place:', event.place);
            console.log('🎯 Event.detail:', event.detail);
            
            // The place can be in event.place or we need to get it from placePrediction
            let place = event.place;
            
            // If place is not directly available, try to get it from the prediction
            if (!place && event.detail?.placePrediction) {
              console.log('📍 Getting place from placePrediction...');
              place = event.detail.placePrediction.toPlace();
            }
            
            if (place) {
              try {
                console.log('📍 Fetching place fields...');
                // Fetch the fields we need
                await place.fetchFields({
                  fields: ['id', 'displayName', 'formattedAddress']
                });

                console.log('✅ Place details:', { 
                  id: place.id, 
                  displayName: place.displayName, 
                  formattedAddress: place.formattedAddress 
                });

                onPlaceSelect({
                  place_id: place.id || '',
                  name: place.displayName || place.formattedAddress || '',
                  formatted_address: place.formattedAddress || ''
                });
                
                // Update the hidden input value
                if (inputRef.current) {
                  inputRef.current.value = place.displayName || place.formattedAddress || '';
                }
              } catch (error) {
                console.error('❌ Error fetching place fields:', error);
              }
            } else {
              console.error('❌ No place found in event');
            }
          });

          // Cleanup function
          return () => {
            if (autocompleteElement && autocompleteElement.parentElement) {
              autocompleteElement.parentElement.removeChild(autocompleteElement);
            }
            if (inputRef.current) {
              inputRef.current.style.display = '';
            }
          };
        } catch (error) {
          console.error('❌ Error creating PlaceAutocompleteElement:', error);
        }
      } else {
        // Fallback to legacy Autocomplete API
        console.log('⚠️ PlaceAutocompleteElement not available, using legacy Autocomplete');
        
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          { 
            types: types,
            fields: ['place_id', 'name', 'formatted_address']
          }
        );

        autocomplete.addListener('place_changed', () => {
          console.log('🎯 Place selected (legacy API)');
          const place = autocomplete.getPlace();
          console.log('📍 Place details:', place);
          
          if (place.place_id) {
            onPlaceSelect({
              place_id: place.place_id,
              name: place.name || place.formatted_address || '',
              formatted_address: place.formatted_address || ''
            });
          }
        });
      }
    }
  }, [isGoogleMapsLoaded, types, onPlaceSelect]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only use fallback if Google Maps is not loaded
    if (!isGoogleMapsLoaded && e.key === 'Enter' && inputValue.trim()) {
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
    <div className="w-full">
      {!isGoogleMapsLoaded && (
        <Input
          ref={inputRef}
          value={inputValue}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={cn(className)}
        />
      )}
      {!isGoogleMapsLoaded && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading Google Places... or press Enter for manual entry.
        </p>
      )}
      {isGoogleMapsLoaded && (
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={cn("hidden", className)}
        />
      )}
    </div>
  );
}

// Helper function to load Google Maps API
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      resolve();
      return;
    }

    // Create a unique callback name
    const callbackName = `googleMapsCallback_${Date.now()}`;
    
    // Set up the callback on window
    (window as any)[callbackName] = () => {
      console.log('✅ Google Maps API callback fired');
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
}