declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete;
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
    namespace places {
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
      }

      interface Autocomplete {
        addListener: (event: string, callback: () => void) => void;
        getPlace: () => PlaceResult;
      }

      interface PlaceResult {
        place_id?: string;
        name?: string;
        formatted_address?: string;
      }
    }
  }
}

export {};