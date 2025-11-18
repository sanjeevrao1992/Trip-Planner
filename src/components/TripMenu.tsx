import { MoreVertical, Mail, Share2, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface TripMenuProps {
  onInviteFriends: () => void;
  onShareLink: () => void;
  onModifyLimits: () => void;
}

export const TripMenu = ({ onInviteFriends, onShareLink, onModifyLimits }: TripMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onInviteFriends();
        }}>
          <Mail className="h-4 w-4 mr-2" />
          Invite friends
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onShareLink();
        }}>
          <Share2 className="h-4 w-4 mr-2" />
          Share link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          onModifyLimits();
        }}>
          <Settings className="h-4 w-4 mr-2" />
          Modify contribution limits
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
