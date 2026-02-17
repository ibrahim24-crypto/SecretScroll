'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Button } from '@/components/ui/button';
import { BookLock, LayoutDashboard, Plus } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageToggle } from '../LanguageToggle';
import { useLocale } from '@/hooks/useLocale';

export function Header() {
  const { user, userProfile, loading } = useAuth();
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <BookLock className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg">{t('appName')}</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button asChild className="hidden md:flex">
              <Link href="/add-person">
                <Plus className="mr-2 h-4 w-4" />
                {t('header.createPost')}
              </Link>
            </Button>

            {userProfile?.role === 'admin' && (
            <>
                {/* Admin Button */}
                <Button asChild variant="outline" className="hidden md:flex">
                <Link href="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('header.admin')}
                </Link>
                </Button>
                <Button asChild variant="outline" size="icon" className="md:hidden">
                    <Link href="/admin">
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="sr-only">{t('header.admin')}</span>
                    </Link>
                </Button>
            </>
            )}
            <ThemeToggle />
            <LanguageToggle />
            {loading ? null : user ? <UserMenu /> : <LoginButton />}
          </nav>
        </div>
      </div>
    </header>
  );
}
