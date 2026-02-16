'use client';

import Link from 'next/link';
import { signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, LogOut, User as UserIcon, Link2 } from 'lucide-react';

export function UserMenu() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Error signing out: ', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // This function is not yet implemented in the UI but is here for future use
  const handleLinkAccount = async () => {
    if (!user || !user.isAnonymous) return;
    try {
        // NOTE: This flow has issues in Firebase v9. It's recommended to use `linkWithRedirect`.
        // For a popup, you'd typically do: await linkWithPopup(user, googleAuthProvider);
        // This is a placeholder for a more robust account linking implementation.
        await signInWithPopup(auth, googleAuthProvider);
        toast({ title: "Account linked!", description: "You can now sign in with Google." });
    } catch (error: any) {
        console.error("Error linking account:", error);
        toast({ title: "Error linking account", description: "This Google account might already be in use.", variant: "destructive"});
    }
  }


  if (!user || !userProfile) {
    return null;
  }
  
  const isAnonymousUser = user.isAnonymous;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
            <AvatarFallback>
              {isAnonymousUser ? 'A' : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon />)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || (isAnonymousUser ? 'Anonymous User' : 'User')}</p>
            {!isAnonymousUser && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userProfile.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>
          </DropdownMenuItem>
        )}
        {/*
        {isAnonymousUser && (
          <DropdownMenuItem onSelect={handleLinkAccount}>
              <Link2 className="mr-2 h-4 w-4" />
              <span>Link with Google</span>
          </DropdownMenuItem>
        )}
        */}
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
