import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { GoogleMapsComponent } from "@/components/GoogleMapsComponent";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";

interface Trip {
  id: string;
  city_name: string;
  city_place_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const TripView = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAnonymousSession();

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) {
        setError("Trip ID not provided");
        setLoading(false);
        return;
      }

      try {
        const { data: trip, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (error) {
          console.error('Error fetching trip:', error);
          setError('Trip not found');
        } else {
          setTrip(trip);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">🌍 Trip to {trip.city_name}</h1>
            <p className="text-muted-foreground">You've been invited to join this amazing trip!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Destination</h3>
                  <p className="text-muted-foreground">{trip.city_name}</p>
                </div>

                {(trip.start_date || trip.end_date) && (
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Travel Dates
                    </h3>
                    <div className="text-muted-foreground">
                      {trip.start_date && <p>From: {formatDate(trip.start_date)}</p>}
                      {trip.end_date && <p>To: {formatDate(trip.end_date)}</p>}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Join This Trip
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <GoogleMapsComponent
                  cityName={trip.city_name}
                  cityPlaceId={trip.city_place_id}
                  className="w-full h-64 rounded-b-lg"
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Ready to Start Planning?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create your own Trip Pals account to collaborate on this trip, add your own trips, and invite more friends!
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.href = '/auth'}>
                  Sign Up Free
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TripView;