import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
  types = ["establishment"],
  value,
  onChange,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  // Get API key and load Google Maps
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        console.log("🗺️ Initializing Google Maps...");
        const { data, error } = await supabase.functions.invoke("get-maps-api-key");
        if (error) throw error;

        const { apiKey: key } = data;
        console.log("🔑 API key received:", key ? "Yes" : "No");
        setApiKey(key);

        if (key) {
          await loadGoogleMapsAPI(key);
          console.log("✅ Google Maps loaded successfully");
          setIsGoogleMapsLoaded(true);
        }
      } catch (error) {
        console.error("❌ Failed to load Google Maps:", error);
      }
    };

    initializeGoogleMaps();
  }, []);

  // Initialize services when Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && window.google) {
      console.log("🔧 Initializing Google Places Services");
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      
      // Create a hidden div for PlacesService
      const hiddenDiv = document.createElement("div");
      placesServiceRef.current = new window.google.maps.places.PlacesService(hiddenDiv);
    }
  }, [isGoogleMapsLoaded]);

  // Fetch predictions when input changes
  useEffect(() => {
    if (!isGoogleMapsLoaded || !autocompleteServiceRef.current || !value || value.trim() === "") {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoadingPredictions(true);
    const request = {
      input: value,
      types: types,
    };

    autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
      setIsLoadingPredictions(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    });
  }, [value, isGoogleMapsLoaded, types]);

  // Handle controlled value updates
  useEffect(() => {
    if (value !== undefined && inputRef.current) {
      console.log("🔄 Value prop changed, updating input:", value);
      if (value === "" && inputRef.current.value !== "") {
        // Clear the input
        inputRef.current.value = "";
      }
    }
  }, [value]);

  // Handle prediction selection
  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    console.log("🎯 Fetching place details for:", prediction.place_id);
    
    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["place_id", "name", "formatted_address"] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          console.log("✅ Place details received:", place);
          const placeResult = {
            place_id: place.place_id || prediction.place_id,
            name: place.name || prediction.structured_formatting.main_text,
            formatted_address: place.formatted_address || prediction.description,
          };
          onPlaceSelectRef.current(placeResult);
          setShowDropdown(false);
          setPredictions([]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPrediction(predictions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          console.log("✏️ Input changed:", e.target.value);
          onChange?.(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(className)}
        autoComplete="off"
      />
      
      {!isGoogleMapsLoaded && (
        <p className="text-xs text-muted-foreground mt-1">Loading Google Places...</p>
      )}

      {isLoadingPredictions && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-b-0",
                selectedIndex === index && "bg-accent"
              )}
            >
              <div className="font-medium text-sm text-foreground">
                {prediction.structured_formatting.main_text}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {prediction.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to load Google Maps API
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      console.log("✅ Google Maps already loaded");
      resolve();
      return;
    }

    // Create a unique callback name
    const callbackName = `googleMapsCallback_${Date.now()}`;

    console.log("📦 Loading Google Maps script...");

    // Set up the callback on window
    (window as any)[callbackName] = () => {
      console.log("✅ Google Maps API callback fired");
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error("❌ Failed to load Google Maps script");
      delete (window as any)[callbackName];
      reject(new Error("Failed to load Google Maps API"));
    };

    document.head.appendChild(script);
  });
}
