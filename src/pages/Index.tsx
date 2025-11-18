import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTripWizard } from '@/components/CreateTripWizard';
import { GoogleMapsComponent } from '@/components/GoogleMapsComponent';
import { TripMenu } from '@/components/TripMenu';
import { InviteFriendsDialog } from '@/components/InviteFriendsDialog';
import { ShareLinkDialog } from '@/components/ShareLinkDialog';
import { TripRecommendations } from '@/components/TripRecommendations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MapPin, LogOut } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  // Load user's trips - ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  // Redirect to auth if not authenticated - AFTER all hooks
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const loadTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleTripCreated = (tripId: string) => {
    setShowCreateTrip(false);
    loadTrips(); // Refresh the trips list
    // Find and select the created trip
    const createdTrip = trips.find((trip: any) => trip.id === tripId);
    if (createdTrip) {
      setSelectedTrip(createdTrip);
    }
  };

  const handleTripClick = (trip: any) => {
    setSelectedTrip(trip);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading || loadingTrips) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showCreateTrip) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateTrip(false)}
            >
              ← Back to Trips
            </Button>
          </div>
          <CreateTripWizard onTripCreated={handleTripCreated} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Pals</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {trips.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No trips yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first trip to start collecting recommendations from friends
            </p>
            <Button onClick={() => setShowCreateTrip(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Trip
            </Button>
          </div>
        ) : (
          // Trips list
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Trips</h2>
              <Button onClick={() => setShowCreateTrip(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </div>
            
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip: any) => (
                  <div 
                    key={trip.id} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      selectedTrip?.id === trip.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleTripClick(trip)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{trip.city_name}</h3>
                      <TripMenu
                        onInviteFriends={() => {
                          setActiveTrip(trip);
                          setInviteDialogOpen(true);
                        }}
                        onShareLink={() => {
                          setActiveTrip(trip);
                          setShareDialogOpen(true);
                        }}
                      />
                    </div>
                    {trip.start_date && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(trip.start_date).toLocaleDateString()} 
                        {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString()}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(trip.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              
              {selectedTrip && (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Map: {selectedTrip.city_name}
                    </h3>
                    <GoogleMapsComponent
                      cityName={selectedTrip.city_name}
                      cityPlaceId={selectedTrip.city_place_id}
                      className="w-full h-96 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Friend Suggestions
                    </h3>
                    <TripRecommendations tripId={selectedTrip.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {activeTrip && (
        <>
          <InviteFriendsDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            tripId={activeTrip.id}
            cityName={activeTrip.city_name}
            shareToken={activeTrip.share_token}
          />
          <ShareLinkDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            shareToken={activeTrip.share_token}
            cityName={activeTrip.city_name}
          />
        </>
      )}
    </div>
  );
};

export default Index;
