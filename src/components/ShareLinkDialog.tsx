import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareToken: string;
  cityName: string;
}

export const ShareLinkDialog = ({
  open,
  onOpenChange,
  shareToken,
  cityName,
}: ShareLinkDialogProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/share/${shareToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share trip to {cityName}</DialogTitle>
          <DialogDescription>
            Share this link or QR code with your friends
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
