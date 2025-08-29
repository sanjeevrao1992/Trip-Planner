import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadGoogleMapsAPI } from './GooglePlacesAutocomplete';

interface GoogleMapsComponentProps {
  cityName: string;
  cityPlaceId?: string;
  className?: string;
}

export function GoogleMapsComponent({ 
  cityName, 
  cityPlaceId, 
  className = "w-full h-64"
}: GoogleMapsComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get API key
        const { data, error: apiError } = await supabase.functions.invoke('get-maps-api-key');
        if (apiError) throw apiError;
        
        const { apiKey } = data;
        
        // Load Google Maps
        await loadGoogleMapsAPI(apiKey);
        
        if (!mapRef.current || !window.google) return;

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 12,
          center: { lat: 0, lng: 0 } // Default center, will be updated
        });

        // Use Places service to get city location
        const service = new window.google.maps.places.PlacesService(map);
        
        if (cityPlaceId && !cityPlaceId.startsWith('mock_')) {
          // Get place by place ID (only if it's a real Google place ID)
          console.log('Using Google Place ID:', cityPlaceId);
          service.getDetails({
            placeId: cityPlaceId,
            fields: ['geometry', 'name']
          }, (place, status) => {
            console.log('Places service response:', { place, status });
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              const location = place.geometry.location;
              map.setCenter(location);
              
              // Add marker
              new window.google.maps.Marker({
                position: location,
                map: map,
                title: cityName
              });
              setIsLoading(false);
            } else {
              console.log('Place ID lookup failed, falling back to geocoding');
              // Fall back to geocoding by name
              geocodeByName();
            }
          });
        } else {
          // Search by city name or handle mock place ID
          geocodeByName();
        }

        function geocodeByName() {
          console.log('Geocoding city name:', cityName);
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: cityName }, (results, status) => {
            console.log('Geocoder response:', { results, status });
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              map.setCenter(location);
              
              // Add marker
              new window.google.maps.Marker({
                position: location,
                map: map,
                title: cityName
              });
              setIsLoading(false);
            } else {
              console.error('Geocoding failed:', status);
              setError(`Could not find location for ${cityName}`);
              setIsLoading(false);
            }
          });
        }

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [cityName, cityPlaceId]);

  if (isLoading) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}