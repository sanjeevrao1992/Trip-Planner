import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  cityName: string;
  shareToken: string;
}

export const InviteFriendsDialog = ({
  open,
  onOpenChange,
  tripId,
  cityName,
  shareToken,
}: InviteFriendsDialogProps) => {
  const [emails, setEmails] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails.length ? newEmails : ['']);
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSend = async () => {
    const validEmails = emails.filter(email => email.trim() && email.includes('@'));
    
    if (validEmails.length === 0) {
      toast({
        title: 'No valid emails',
        description: 'Please enter at least one valid email address',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      
      // TODO: Implement email sending via edge function
      console.log('Sending invites to:', validEmails);
      console.log('Share URL:', shareUrl);
      
      toast({
        title: 'Invites sent!',
        description: `Sent ${validEmails.length} invitation${validEmails.length > 1 ? 's' : ''}`,
      });
      
      onOpenChange(false);
      setEmails(['']);
    } catch (error) {
      toast({
        title: 'Error sending invites',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite friends to {cityName}</DialogTitle>
          <DialogDescription>
            Enter email addresses to send trip invitations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                />
              </div>
              {emails.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addEmailField}
            className="w-full"
          >
            + Add another email
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
