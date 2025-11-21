import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadGoogleMapsAPI } from './GooglePlacesAutocomplete';

interface Recommendation {
  id: string;
  place_id: string;
  place_name: string;
  place_address?: string | null;
  category: 'eat' | 'visit';
}

interface GoogleMapsComponentProps {
  cityName: string;
  cityPlaceId?: string;
  className?: string;
  recommendations?: Recommendation[];
  onMapReady?: (openMarker: (placeId: string) => void) => void;
}

export function GoogleMapsComponent({ 
  cityName, 
  cityPlaceId, 
  className = "w-full h-64",
  recommendations = [],
  onMapReady
}: GoogleMapsComponentProps) {
  console.log('🗺️ GoogleMapsComponent: Component rendered with props:', { cityName, cityPlaceId, className });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<Map<string, any>>(new Map());
  const [infoWindow, setInfoWindow] = useState<any>(null);

  console.log('🗺️ GoogleMapsComponent: Current state:', { isLoading, error, mapContainer: !!mapContainer });

  // Use callback ref to know when DOM element is available
  const mapRef = React.useCallback((node: HTMLDivElement | null) => {
    console.log('🗺️ GoogleMapsComponent: mapRef callback called with node:', !!node);
    if (node !== null) {
      setMapContainer(node);
    }
  }, []);

  useEffect(() => {
    console.log('🗺️ GoogleMapsComponent: useEffect triggered, mapContainer:', !!mapContainer);
    if (!mapContainer) {
      console.log('🗺️ GoogleMapsComponent: No mapContainer, returning early');
      return;
    }

    const initializeMap = async () => {
      try {
        console.log('🗺️ Starting map initialization for:', cityName);
        setIsLoading(true);
        setError(null);

        // Get API key
        console.log('📡 Fetching API key from edge function...');
        console.log('📡 Making request to supabase.functions.invoke...');
        
        const response = await supabase.functions.invoke('get-maps-api-key');
        console.log('📡 Full response object:', response);
        console.log('📡 Response data:', response.data);
        console.log('📡 Response error:', response.error);
        
        if (response.error) {
          console.error('❌ API key fetch error:', response.error);
          setError(`Failed to get API key: ${response.error.message || JSON.stringify(response.error)}`);
          setIsLoading(false);
          return;
        }
        
        // Handle success or server-reported error in a 200 response
        const apiKey = (response.data as any)?.apiKey as string | undefined;
        const serverError = (response.data as any)?.error as string | undefined;
        if (!apiKey) {
          console.error('❌ No API key in response:', response.data);
          setError(serverError ? `Failed to get API key: ${serverError}` : 'No API key received from server');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ API key received:', apiKey ? 'Yes' : 'No', 'Length:', apiKey?.length);
        console.log('✅ First 10 chars of API key:', apiKey?.substring(0, 10));
        
        // Load Google Maps
        console.log('🔄 Loading Google Maps API...');
        await loadGoogleMapsAPI(apiKey);
        console.log('✅ Google Maps API loaded successfully');

        if (!window.google) {
          console.error('❌ Google Maps not available on window object');
          setError('Google Maps failed to load');
          setIsLoading(false);
          return;
        }

        console.log('🗺️ Creating Google Map...');
        // Create map
        const map = new window.google.maps.Map(mapContainer, {
          zoom: 12,
          center: { lat: 0, lng: 0 } // Default center, will be updated
        });
        console.log('✅ Map created successfully');
        
        // Store map instance for later use
        setMapInstance(map);

        // Use Places service to get city location (fallback to new API later)
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
              
              // Add recommendation markers
              addRecommendationMarkers(map);
              
              console.log('✅ Map fully loaded with place ID');
              setIsLoading(false);
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

        async function addRecommendationMarkers(map: any) {
          if (!recommendations || recommendations.length === 0) return;
          
          const service = new window.google.maps.places.PlacesService(map as any);
          const newInfoWindow = new window.google.maps.InfoWindow();
          setInfoWindow(newInfoWindow);
          const newMarkers = new Map<string, any>();
          
          // Fetch submission reasons for all recommendations
          const { data: submissions } = await supabase
            .from('submissions')
            .select('recommendation_id, why_text, submitter_name')
            .in('recommendation_id', recommendations.map(r => r.id))
            .eq('is_endorsement', false);
          
          const reasonsMap = new Map(
            submissions?.map(s => [s.recommendation_id, { why: s.why_text, name: s.submitter_name }]) || []
          );
          
          recommendations.forEach((rec) => {
            service.getDetails({
              placeId: rec.place_id,
              fields: ['geometry', 'name', 'formatted_address', 'rating', 'photos']
            }, (place, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                const marker = new window.google.maps.Marker({
                  position: place.geometry.location,
                  map: map as any,
                  title: rec.place_name,
                  icon: {
                    url: rec.category === 'eat' 
                      ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                      : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  }
                });
                
                newMarkers.set(rec.place_id, { marker, place, rec });
                
                const openThisMarker = () => {
                  const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 200 });
                  const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${rec.place_id}`;
                  const reason = reasonsMap.get(rec.id);
                  const content = `
                    <div style="max-width: 280px;">
                      <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #1a73e8;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a73e8; cursor: pointer;">${rec.place_name}</h3>
                      </a>
                      ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
                      ${place.rating ? `<p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">⭐ ${place.rating}</p>` : ''}
                      ${reason?.why ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555; font-style: italic; padding: 8px; background: #f5f5f5; border-radius: 4px;"><strong>${reason.name || 'Someone'}:</strong> "${reason.why}"</p>` : ''}
                      <p style="margin: 0; color: #666; font-size: 12px;">${place.formatted_address || rec.place_address || ''}</p>
                    </div>
                  `;
                  newInfoWindow.setContent(content);
                  newInfoWindow.open(map as any, marker);
                  map.setCenter(place.geometry.location);
                };
                
                marker.addListener('click', openThisMarker);
              }
            });
          });
          
          setMarkers(newMarkers);
          
          // Expose function to open marker by place ID
          if (onMapReady) {
            onMapReady((placeId: string) => {
              const markerData = newMarkers.get(placeId);
              if (markerData) {
                const { marker, place, rec } = markerData;
                map.setCenter(place.geometry.location);
                
                const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 200 });
                const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${rec.place_id}`;
                const reason = reasonsMap.get(rec.id);
                const content = `
                  <div style="max-width: 280px;">
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #1a73e8;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a73e8; cursor: pointer;">${rec.place_name}</h3>
                    </a>
                    ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
                    ${place.rating ? `<p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">⭐ ${place.rating}</p>` : ''}
                    ${reason?.why ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555; font-style: italic; padding: 8px; background: #f5f5f5; border-radius: 4px;"><strong>${reason.name || 'Someone'}:</strong> "${reason.why}"</p>` : ''}
                    <p style="margin: 0; color: #666; font-size: 12px;">${place.formatted_address || rec.place_address || ''}</p>
                  </div>
                `;
                newInfoWindow.setContent(content);
                newInfoWindow.open(map as any, marker);
              }
            });
          }
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
              
              // Add recommendation markers
              addRecommendationMarkers(map);
              
              console.log('✅ Map fully loaded with geocoding');
              setIsLoading(false);
            } else {
              console.error('❌ Geocoding failed:', status);
              setError(`Could not find location for ${cityName}`);
              setIsLoading(false);
            }
          });
        }

      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        
        // Check for specific API errors
        if (error instanceof Error) {
          if (error.message.includes('ApiNotActivatedMapError')) {
            setError('Google Maps API is not activated. Please enable the Maps JavaScript API in your Google Cloud Console.');
          } else if (error.message.includes('RefererNotAllowedMapError')) {
            setError('Domain not authorized. Please add this domain to your API key restrictions.');
          } else {
            setError(`Map initialization failed: ${error.message}`);
          }
        } else {
          setError('Failed to load map');
        }
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [mapContainer, cityName, cityPlaceId]);

  // Separate effect for handling recommendation markers when they change
  useEffect(() => {
    if (!mapInstance || !window.google) return;
    
    // Clear existing markers
    markers.forEach(({ marker }) => marker.setMap(null));
    setMarkers(new Map());
    
    if (recommendations.length === 0) return;
    
    console.log('🎯 Adding/updating recommendation markers:', recommendations.length);
    
    const addMarkers = async () => {
      const service = new window.google.maps.places.PlacesService(mapInstance);
      const newInfoWindow = new window.google.maps.InfoWindow();
      setInfoWindow(newInfoWindow);
      const newMarkers = new Map<string, any>();
      
      // Fetch submission reasons for all recommendations
      const { data: submissions } = await supabase
        .from('submissions')
        .select('recommendation_id, why_text, submitter_name')
        .in('recommendation_id', recommendations.map(r => r.id))
        .eq('is_endorsement', false);
      
      const reasonsMap = new Map(
        submissions?.map(s => [s.recommendation_id, { why: s.why_text, name: s.submitter_name }]) || []
      );
      
      recommendations.forEach((rec) => {
        service.getDetails({
          placeId: rec.place_id,
          fields: ['geometry', 'name', 'formatted_address', 'rating', 'photos']
        }, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const marker = new window.google.maps.Marker({
              position: place.geometry.location,
              map: mapInstance,
              title: rec.place_name,
              icon: {
                url: rec.category === 'eat' 
                  ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }
            });
            
            newMarkers.set(rec.place_id, { marker, place, rec });
            
            const openThisMarker = () => {
              const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 200 });
              const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${rec.place_id}`;
              const reason = reasonsMap.get(rec.id);
              const content = `
                <div style="max-width: 280px;">
                  <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #1a73e8;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a73e8; cursor: pointer;">${rec.place_name}</h3>
                  </a>
                  ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
                  ${place.rating ? `<p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">⭐ ${place.rating}</p>` : ''}
                  ${reason?.why ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555; font-style: italic; padding: 8px; background: #f5f5f5; border-radius: 4px;"><strong>${reason.name || 'Someone'}:</strong> "${reason.why}"</p>` : ''}
                  <p style="margin: 0; color: #666; font-size: 12px;">${place.formatted_address || rec.place_address || ''}</p>
                </div>
              `;
              newInfoWindow.setContent(content);
              newInfoWindow.open(mapInstance, marker);
              mapInstance.setCenter(place.geometry.location);
            };
            
            marker.addListener('click', openThisMarker);
          }
        });
      });
      
      setMarkers(newMarkers);
      
      // Expose function to open marker by place ID
      if (onMapReady) {
        onMapReady((placeId: string) => {
          const markerData = newMarkers.get(placeId);
          if (markerData) {
            const { marker, place, rec } = markerData;
            mapInstance.setCenter(place.geometry.location);
            
            const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 200 });
            const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${rec.place_id}`;
            const reason = reasonsMap.get(rec.id);
            const content = `
              <div style="max-width: 280px;">
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #1a73e8;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a73e8; cursor: pointer;">${rec.place_name}</h3>
                </a>
                ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
                ${place.rating ? `<p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">⭐ ${place.rating}</p>` : ''}
                ${reason?.why ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555; font-style: italic; padding: 8px; background: #f5f5f5; border-radius: 4px;"><strong>${reason.name || 'Someone'}:</strong> "${reason.why}"</p>` : ''}
                <p style="margin: 0; color: #666; font-size: 12px;">${place.formatted_address || rec.place_address || ''}</p>
              </div>
            `;
            newInfoWindow.setContent(content);
            newInfoWindow.open(mapInstance, marker);
          }
        });
      }
    };
    
    addMarkers();
  }, [mapInstance, recommendations, onMapReady]);

  // Always render the map container, but show loading/error overlays
  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-destructive">Failed to load map</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}