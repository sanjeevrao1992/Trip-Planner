import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, MapPin } from 'lucide-react';

interface Recommendation {
  id: string;
  place_name: string;
  place_address: string | null;
  category: 'eat' | 'visit';
  endorsement_count: number;
}

interface TripRecommendationsProps {
  tripId: string;
  eatLimit?: number;
  visitLimit?: number;
}

export const TripRecommendations = ({ tripId, eatLimit = 4, visitLimit = 4 }: TripRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [tripId]);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('trip_id', tripId)
        .order('endorsement_count', { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const eatRecommendations = recommendations.filter(r => r.category === 'eat');
  const visitRecommendations = recommendations.filter(r => r.category === 'visit');

  const EmptyState = () => (
    <p className="text-muted-foreground text-sm italic">
      There are no contributions yet. A good excuse to say hi 😉
    </p>
  );

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Best places to eat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Best places to visit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Best places to eat
            </div>
            <span className="text-sm text-muted-foreground font-normal">
              Limit: {eatLimit} contributor{eatLimit !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eatRecommendations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {eatRecommendations.map((rec) => (
                <div key={rec.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{rec.place_name}</h4>
                      {rec.place_address && (
                        <p className="text-sm text-muted-foreground">{rec.place_address}</p>
                      )}
                    </div>
                    {rec.endorsement_count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {rec.endorsement_count} 👍
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Best places to visit
            </div>
            <span className="text-sm text-muted-foreground font-normal">
              Limit: {visitLimit} contributor{visitLimit !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visitRecommendations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {visitRecommendations.map((rec) => (
                <div key={rec.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{rec.place_name}</h4>
                      {rec.place_address && (
                        <p className="text-sm text-muted-foreground">{rec.place_address}</p>
                      )}
                    </div>
                    {rec.endorsement_count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {rec.endorsement_count} 👍
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
