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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, LogOut, User as UserIcon, Link2, Info, FileText, Copyright, History } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

export function UserMenu() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useLocale();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: t('userMenu.signOut'),
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
            <p className="text-sm font-medium leading-none">{user.displayName || (isAnonymousUser ? t('userMenu.anonymousUser') : t('userMenu.user'))}</p>
            {!isAnonymousUser && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userProfile.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>{t('userMenu.adminDashboard')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Info className="mr-2 h-4 w-4" />
            <span>{t('userMenu.infoAndLegal')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem asChild>
                <Link href="/patch-notes">
                  <History className="mr-2 h-4 w-4" />
                  <span>{t('userMenu.patchNotes')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about">
                  <Info className="mr-2 h-4 w-4" />
                  <span>{t('userMenu.about')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/terms">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{t('userMenu.terms')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/copyright">
                  <Copyright className="mr-2 h-4 w-4" />
                  <span>{t('userMenu.copyright')}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/*
        {isAnonymousUser && (
          <DropdownMenuItem onSelect={handleLinkAccount}>
              <Link2 className="mr-2 h-4 w-4" />
              <span>Link with Google</span>
          </DropdownMenuItem>
        )}
        */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('userMenu.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
