import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Copy, QrCode, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface CreateTripWizardProps {
  onTripCreated: (tripId: string) => void;
}

export function CreateTripWizard({ onTripCreated }: CreateTripWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  // Form data
  const [selectedCity, setSelectedCity] = useState<PlaceResult | null>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [inviteEmails, setInviteEmails] = useState('');
  const [createdTrip, setCreatedTrip] = useState<{id: string, shareUrl: string} | null>(null);

  const handleCitySelect = (place: PlaceResult) => {
    setSelectedCity(place);
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedCity) {
      toast({
        title: "City Required",
        description: "Please select a city for your trip.",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleCreateTrip = async () => {
    if (!selectedCity) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          city_name: selectedCity.name,
          city_place_id: selectedCity.place_id,
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          owner_id: user?.id,
        })
        .select('id, share_token')
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/share/${data.share_token}`;
      setCreatedTrip({ id: data.id, shareUrl });
      
      // TODO: Send invite emails via n8n webhook
      if (inviteEmails.trim()) {
        console.log('Would send invites to:', inviteEmails.split(',').map(e => e.trim()));
      }
      
      toast({
        title: "Trip Created!",
        description: `Your trip to ${selectedCity.name} has been created.`,
      });
      
      setStep(4);
    } catch (error: any) {
      toast({
        title: "Error Creating Trip",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (createdTrip) {
      await navigator.clipboard.writeText(createdTrip.shareUrl);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard!",
      });
    }
  };

  const goToTripMap = () => {
    if (createdTrip) {
      onTripCreated(createdTrip.id);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Trip - Step {step} of 4</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Destination City *</Label>
                <GooglePlacesAutocomplete
                  onPlaceSelect={handleCitySelect}
                  placeholder="Search for a city..."
                  types={['(cities)']}
                />
                {selectedCity && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedCity.name}
                  </p>
                )}
              </div>
              <Button onClick={handleNextStep} className="w-full">
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                <Label>Travel Dates (Optional)</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNextStep} className="flex-1">
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Invite Friends (Optional)</Label>
                <Input
                  placeholder="Enter email addresses, separated by commas"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  You can also share the link later
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleCreateTrip} 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Trip'}
                </Button>
              </div>
            </>
          )}

          {step === 4 && createdTrip && (
            <>
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Trip Created Successfully!</h3>
                  <p className="text-sm text-muted-foreground">
                    Share this link with friends so they can add recommendations:
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md text-sm break-all">
                    {createdTrip.shareUrl}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={copyShareLink}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
                  </div>
                </div>
                
                <Button onClick={goToTripMap} className="w-full">
                  View Trip Map
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}