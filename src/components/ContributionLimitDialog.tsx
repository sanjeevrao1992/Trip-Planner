import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UtensilsCrossed, MapPin } from 'lucide-react';

interface ContributionLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  currentEatLimit: number;
  currentVisitLimit: number;
  onUpdate: () => void;
}

export const ContributionLimitDialog = ({
  open,
  onOpenChange,
  tripId,
  currentEatLimit,
  currentVisitLimit,
  onUpdate,
}: ContributionLimitDialogProps) => {
  const [eatLimit, setEatLimit] = useState(currentEatLimit.toString());
  const [visitLimit, setVisitLimit] = useState(currentVisitLimit.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          eat_contribution_limit: parseInt(eatLimit),
          visit_contribution_limit: parseInt(visitLimit),
        })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Limits Updated",
        description: "Contribution limits have been updated successfully.",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contribution Limits</DialogTitle>
          <DialogDescription>
            Set the maximum number of contributors per category
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eat-limit" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Best places to eat
            </Label>
            <Select value={eatLimit} onValueChange={setEatLimit}>
              <SelectTrigger id="eat-limit">
                <SelectValue placeholder="Select limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 contributor</SelectItem>
                <SelectItem value="2">2 contributors</SelectItem>
                <SelectItem value="3">3 contributors</SelectItem>
                <SelectItem value="4">4 contributors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-limit" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Best places to visit
            </Label>
            <Select value={visitLimit} onValueChange={setVisitLimit}>
              <SelectTrigger id="visit-limit">
                <SelectValue placeholder="Select limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 contributor</SelectItem>
                <SelectItem value="2">2 contributors</SelectItem>
                <SelectItem value="3">3 contributors</SelectItem>
                <SelectItem value="4">4 contributors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
