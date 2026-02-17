'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export default function TermsPage() {
  const { t } = useLocale();
  return (
    <main className="container py-8 max-w-4xl mx-auto px-4">
       <header className="flex items-center justify-between mb-8">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('buttons.back')}
          </Link>
        </Button>
      </header>

      <div className="space-y-6">
        <h1 className="text-4xl font-bold font-headline">{t('termsPage.title')}</h1>
        <p className="text-lg text-muted-foreground">
          {t('termsPage.subtitle')}
        </p>
        
        <div className="space-y-4 text-secondary-foreground">
            <p>
              {t('termsPage.p1')}
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">{t('termsPage.h1')}</h2>
            <p>
              {t('termsPage.p2')}
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">{t('termsPage.h2')}</h2>
             <p>
              {t('termsPage.p3')}
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">{t('termsPage.h3')}</h2>
            <p>
              {t('termsPage.p4')}
            </p>
        </div>
      </div>
    </main>
  );
}
