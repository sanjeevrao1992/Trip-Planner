import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

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

  // Initialize autocomplete ONCE when Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && inputRef.current && window.google && !autocompleteRef.current) {
      console.log("🔧 Initializing Google Places Autocomplete (ONE TIME)");

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: types,
        fields: ["place_id", "name", "formatted_address"],
      });

      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener("place_changed", () => {
        console.log("🎯 Place selection event fired");
        const place = autocomplete.getPlace();
        console.log("📍 Place details:", {
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
        });

        if (place.place_id) {
          console.log("✅ Valid place selected, calling onPlaceSelect");

          const placeResult = {
            place_id: place.place_id,
            name: place.name || place.formatted_address || "",
            formatted_address: place.formatted_address || "",
          };

          // Call immediately - parent will handle clearing
          onPlaceSelectRef.current(placeResult);
        } else {
          console.error("❌ No place_id in selected place");
        }
      });

      return () => {
        console.log("🧹 Cleaning up autocomplete on unmount");
        if (listener) {
          window.google.maps.event.removeListener(listener);
        }
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
      };
    }
  }, [isGoogleMapsLoaded, types]);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log("⌨️ Key pressed:", e.key);
    // Only use fallback if Google Maps is not loaded
    if (!isGoogleMapsLoaded && e.key === "Enter" && inputRef.current?.value.trim()) {
      console.log("⚠️ Using fallback mode (Enter pressed without Google Maps)");
      const mockPlace: PlaceResult = {
        place_id: "mock_" + Date.now(),
        name: inputRef.current.value.trim(),
        formatted_address: inputRef.current.value.trim(),
      };
      onPlaceSelect(mockPlace);
    }
  };

  return (
    <div className="w-full">
      <Input
        ref={inputRef}
        defaultValue={value}
        onChange={(e) => {
          console.log("✏️ Input changed:", e.target.value);
          onChange?.(e.target.value);
        }}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className={cn(className)}
      />
      {!isGoogleMapsLoaded && (
        <p className="text-xs text-muted-foreground mt-1">Loading Google Places... or press Enter for manual entry.</p>
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
