'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Button } from '@/components/ui/button';
import { BookLock, LayoutDashboard, UserPlus } from 'lucide-react';

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <BookLock className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg">SecretReels</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button asChild>
              <Link href="/add-person">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Person
              </Link>
            </Button>
            {user && user.email === 'ibrahimezzine09@gmail.com' && (
              <Button asChild variant="outline">
                <Link href="/admin">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}
            {loading ? null : user ? <UserMenu /> : <LoginButton />}
          </nav>
        </div>
      </div>
    </header>
  );
}
