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
  const [isInitialized, setIsInitialized] = useState(false);

  // First useEffect to handle when DOM element becomes available
  useEffect(() => {
    if (!mapRef.current || isInitialized) return;

    const initializeMap = async () => {
      try {
        console.log('🗺️ Starting map initialization for:', cityName);
        setIsLoading(true);
        setError(null);

        // Get API key
        console.log('📡 Fetching API key...');
        const { data, error: apiError } = await supabase.functions.invoke('get-maps-api-key');
        if (apiError) {
          console.error('❌ API key fetch error:', apiError);
          throw apiError;
        }
        
        const { apiKey } = data;
        console.log('✅ API key received:', apiKey ? 'Yes' : 'No');
        
        // Load Google Maps
        console.log('🔄 Loading Google Maps API...');
        await loadGoogleMapsAPI(apiKey);
        console.log('✅ Google Maps API loaded successfully');

        // Double check the ref is still available
        if (!mapRef.current) {
          console.error('❌ Map container not available after async operations');
          setError('Map container not available');
          setIsLoading(false);
          return;
        }

        if (!window.google) {
          console.error('❌ Google Maps not available on window object');
          setError('Google Maps failed to load');
          setIsLoading(false);
          return;
        }

        console.log('🗺️ Creating Google Map...');
        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 12,
          center: { lat: 0, lng: 0 } // Default center, will be updated
        });
        console.log('✅ Map created successfully');

        // Use Places service to get city location
        const service = new window.google.maps.places.PlacesService(map);
        
        if (cityPlaceId && !cityPlaceId.startsWith('mock_')) {
          // Get place by place ID (only if it's a real Google place ID)
          console.log('🔍 Using Google Place ID:', cityPlaceId);
          service.getDetails({
            placeId: cityPlaceId,
            fields: ['geometry', 'name']
          }, (place, status) => {
            console.log('📍 Places service response:', { place, status });
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              const location = place.geometry.location;
              console.log('✅ Place found, setting center:', { lat: location.lat(), lng: location.lng() });
              map.setCenter(location);
              
              // Add marker
              new window.google.maps.Marker({
                position: location,
                map: map,
                title: cityName
              });
              console.log('✅ Map fully loaded with place ID');
              setIsLoading(false);
              setIsInitialized(true);
            } else {
              console.log('⚠️ Place ID lookup failed, falling back to geocoding. Status:', status);
              // Fall back to geocoding by name
              geocodeByName();
            }
          });
        } else {
          // Search by city name or handle mock place ID
          console.log('🔍 Using city name geocoding (mock or no place ID)');
          geocodeByName();
        }

        function geocodeByName() {
          console.log('🌍 Geocoding city name:', cityName);
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: cityName }, (results, status) => {
            console.log('📍 Geocoder response:', { results: results?.length, status });
            
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              console.log('✅ Location found:', { lat: location.lat(), lng: location.lng() });
              map.setCenter(location);
              
              // Add marker
              new window.google.maps.Marker({
                position: location,
                map: map,
                title: cityName
              });
              console.log('✅ Map fully loaded with geocoding');
              setIsLoading(false);
              setIsInitialized(true);
            } else {
              console.error('❌ Geocoding failed:', status);
              setError(`Could not find location for ${cityName}`);
              setIsLoading(false);
            }
          });
        }

      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [cityName, cityPlaceId, isInitialized]);

  // Reset initialization when city changes
  useEffect(() => {
    setIsInitialized(false);
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