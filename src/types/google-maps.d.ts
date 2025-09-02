declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options?: google.maps.MapOptions) => google.maps.Map;
        Marker: new (options?: google.maps.MarkerOptions) => google.maps.Marker;
        Geocoder: new () => google.maps.Geocoder;
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete;
          PlacesService: new (map: google.maps.Map) => google.maps.places.PlacesService;
          PlacesServiceStatus: {
            OK: 'OK';
            ZERO_RESULTS: 'ZERO_RESULTS';
            OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT';
            REQUEST_DENIED: 'REQUEST_DENIED';
            INVALID_REQUEST: 'INVALID_REQUEST';
            UNKNOWN_ERROR: 'UNKNOWN_ERROR';
          };
          Place: new (options: { id: string }) => google.maps.places.Place;
        };
        event: {
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
  }
}

declare namespace google {
  namespace maps {
    interface Map {
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
    }

    interface Marker {
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng | LatLngLiteral): void;
    }

    interface Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void): void;
    }

    interface MapOptions {
      zoom?: number;
      center?: LatLng | LatLngLiteral;
      mapTypeId?: string;
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface GeocoderRequest {
      address?: string;
      placeId?: string;
    }

    interface GeocoderResult {
      geometry: {
        location: LatLng;
      };
      formatted_address: string;
    }

    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

    namespace places {
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
      }

      interface Autocomplete {
        addListener: (event: string, callback: () => void) => void;
        getPlace: () => PlaceResult;
      }

      interface PlacesService {
        getDetails: (request: PlaceDetailsRequest, callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void) => void;
      }

      interface PlaceResult {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: {
          location?: LatLng;
        };
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }

      type PlacesServiceStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

      interface Place {
        fetchFields: (options: { fields: string[] }) => Promise<{ places: PlaceResult[] }>;
      }
    }
  }
}

export {};