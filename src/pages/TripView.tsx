import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, UtensilsCrossed, Landmark } from "lucide-react";
import { GoogleMapsComponent } from "@/components/GoogleMapsComponent";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { ContributeSuggestionsDialog } from "@/components/ContributeSuggestionsDialog";
import { toast } from "sonner";

interface Trip {
  id: string;
  city_name: string;
  city_place_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  owner_name?: string;
  eat_contribution_limit?: number;
  visit_contribution_limit?: number;
}

const TripView = () => {
  const location = useLocation();
  const shareToken = location.pathname.replace('/share/', '');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributorName, setContributorName] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"eat" | "visit">("eat");
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const sessionId = useAnonymousSession() || "";

  useEffect(() => {
    const fetchTrip = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_trip_by_share_token', {
          token: shareToken
        });

        if (error) {
          setError('Failed to load trip');
        } else if (!data || data.length === 0) {
          setError('Trip not found');
        } else {
          const tripData = data[0];
          
          // Fetch full trip details including contribution limits
          const { data: tripDetails } = await supabase
            .from("trips")
            .select("eat_contribution_limit, visit_contribution_limit")
            .eq("id", tripData.id)
            .single();
          
          setTrip({
            id: tripData.id,
            city_name: tripData.city_name,
            city_place_id: tripData.city_place_id,
            start_date: tripData.start_date,
            end_date: tripData.end_date,
            created_at: new Date().toISOString(),
            owner_name: tripData.owner_name,
            eat_contribution_limit: tripDetails?.eat_contribution_limit || 4,
            visit_contribution_limit: tripDetails?.visit_contribution_limit || 4,
          });
        }
      } catch (err) {
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [shareToken]);

  useEffect(() => {
    if (trip && hasEnteredName) {
      fetchRecommendations();
    }
  }, [trip, hasEnteredName]);

  const fetchRecommendations = async () => {
    if (!trip) return;
    
    const { data } = await supabase
      .from("recommendations")
      .select("*")
      .eq("trip_id", trip.id);
    
    if (data) {
      setRecommendations(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || "This trip doesn't exist or is no longer available."}</p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Trip Pals
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEnterName = () => {
    if (!contributorName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setHasEnteredName(true);
  };

  const handleOpenDialog = (category: "eat" | "visit") => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  if (!hasEnteredName) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left section - Trip details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">🌍 {trip.city_name}</h1>
                <p className="text-muted-foreground mb-4">You're invited to contribute to this trip!</p>
                
                {(trip.start_date || trip.end_date) && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trip.start_date && formatDate(trip.start_date)}
                      {trip.start_date && trip.end_date && ' - '}
                      {trip.end_date && formatDate(trip.end_date)}
                    </span>
                  </div>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Enter Your Name</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Your name"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEnterName()}
                    />
                    <Button onClick={handleEnterName}>
                      Enter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right section - Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {trip.city_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <GoogleMapsComponent
                  cityName={trip.city_name}
                  cityPlaceId={trip.city_place_id}
                  className="w-full h-96 rounded-b-lg"
                />
              </CardContent>
            </Card>
          </div>

          {/* Bottom section - Create account CTA */}
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Want to create your own trip?</h3>
                <p className="text-muted-foreground">
                  Create a free account to organize your own trips and collect suggestions from friends.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => window.location.href = '/auth'}>
                    Create Account
                  </Button>
                  <Button variant="outline" onClick={() => window.open('https://docs.lovable.dev', '_blank')}>
                    Learn More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">🌍 Trip to {trip.city_name}</h1>
            <p className="text-muted-foreground">Welcome, {contributorName}!</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Provide suggestions for:</h2>
            <div className="flex gap-4">
              <Button 
                onClick={() => handleOpenDialog("eat")}
                className="flex-1"
                variant="outline"
              >
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Best Places to Eat
              </Button>
              <Button 
                onClick={() => handleOpenDialog("visit")}
                className="flex-1"
                variant="outline"
              >
                <Landmark className="h-4 w-4 mr-2" />
                Best Places to Visit
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {trip.city_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GoogleMapsComponent
                cityName={trip.city_name}
                cityPlaceId={trip.city_place_id}
                className="w-full h-96 rounded-b-lg"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ContributeSuggestionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        limit={selectedCategory === "eat" ? trip.eat_contribution_limit || 4 : trip.visit_contribution_limit || 4}
        tripId={trip.id}
        cityName={trip.city_name}
        contributorName={contributorName}
        sessionId={sessionId}
        onSubmitSuccess={fetchRecommendations}
      />
    </div>
  );
};

export default TripView;