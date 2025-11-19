import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Place {
  id: string;
  place_id: string;
  name: string;
  address: string;
  why_text?: string;
}

interface ContributeSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: "eat" | "visit";
  limit: number;
  tripId: string;
  cityName: string;
  contributorName: string;
  sessionId: string;
  onSubmitSuccess: () => void;
}

export const ContributeSuggestionsDialog = ({
  open,
  onOpenChange,
  category,
  limit,
  tripId,
  cityName,
  contributorName,
  sessionId,
  onSubmitSuccess,
}: ContributeSuggestionsDialogProps) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchKey, setSearchKey] = useState(0);

  const handlePlaceSelect = (place: { place_id: string; name: string; formatted_address: string }) => {
    console.log('🎯 ContributeSuggestionsDialog: handlePlaceSelect called', place);
    console.log('📊 Current places count:', places.length, 'Limit:', limit);
    
    if (places.length >= limit) {
      console.log('❌ Limit reached');
      toast.error(`You can only suggest up to ${limit} place${limit > 1 ? 's' : ''}`);
      return;
    }

    // Check if place already added
    if (places.some(p => p.place_id === place.place_id)) {
      console.log('❌ Place already added');
      toast.error("This place has already been added");
      return;
    }

    console.log('✅ Adding place to list');
    setPlaces(prev => [...prev, {
      id: crypto.randomUUID(),
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
    }]);
    
    console.log('🔄 Resetting autocomplete with new key');
    // Reset the autocomplete input by changing the key
    setSearchKey(prev => prev + 1);
  };

  const handleRemovePlace = (id: string) => {
    setPlaces(places.filter(p => p.id !== id));
  };

  const handleUpdateWhy = (id: string, whyText: string) => {
    setPlaces(places.map(p => 
      p.id === id ? { ...p, why_text: whyText } : p
    ));
  };

  const handleSubmit = async () => {
    if (places.length === 0) {
      toast.error("Please add at least one place");
      return;
    }

    setIsSubmitting(true);
    try {
      // For each place, create or get recommendation, then create submission
      for (const place of places) {
        // First, check if recommendation already exists
        const { data: existingRec } = await supabase
          .from("recommendations")
          .select("id")
          .eq("trip_id", tripId)
          .eq("place_id", place.place_id)
          .eq("category", category)
          .maybeSingle();

        let recommendationId: string;

        if (existingRec) {
          recommendationId = existingRec.id;
        } else {
          // Create new recommendation
          const { data: newRec, error: recError } = await supabase
            .from("recommendations")
            .insert({
              trip_id: tripId,
              place_id: place.place_id,
              place_name: place.name,
              place_address: place.address,
              category: category,
            })
            .select()
            .single();

          if (recError) throw recError;
          recommendationId = newRec.id;
        }

        // Create submission
        const { error: subError } = await supabase
          .from("submissions")
          .insert({
            trip_id: tripId,
            recommendation_id: recommendationId,
            category: category,
            submitter_name: contributorName,
            submitter_session_id: sessionId,
            is_endorsement: false,
            why_text: place.why_text || null,
          });

        if (subError) throw subError;
      }

      toast.success("Your suggestions have been added!");
      setPlaces([]);
      onOpenChange(false);
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting suggestions:", error);
      toast.error("Failed to submit suggestions. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('🚪 Dialog onOpenChange called:', newOpen);
      onOpenChange(newOpen);
    }}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => {
          // Prevent dialog from closing when clicking on Google Places dropdown
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Best Places to {category === "eat" ? "Eat" : "Visit"}
          </DialogTitle>
          <DialogDescription>
            The trip creator has set a limit of {limit} place{limit > 1 ? 's' : ''} per contributor for this category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            {places.length < limit ? (
              <GooglePlacesAutocomplete
                key={searchKey}
                onPlaceSelect={handlePlaceSelect}
                placeholder={`Search for places in ${cityName}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                You've reached the maximum number of suggestions for this category
              </p>
            )}
          </div>

          {places.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Your suggestions ({places.length}/{limit}):
              </p>
              {places.map((place) => (
                <div
                  key={place.id}
                  className="p-3 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{place.name}</p>
                      <p className="text-sm text-muted-foreground">{place.address}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlace(place.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Why do you recommend this place? (optional)
                    </label>
                    <textarea
                      value={place.why_text || ""}
                      onChange={(e) => handleUpdateWhy(place.id, e.target.value)}
                      placeholder="Share your experience or reason for recommending..."
                      className="w-full p-2 text-sm border rounded-md bg-background resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {places.length < limit && places.length > 0 && (
            <p className="text-sm text-muted-foreground">
              You can add {limit - places.length} more place{limit - places.length > 1 ? 's' : ''}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={places.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Suggestions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
