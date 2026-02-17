'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export default function AboutPage() {
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
        <h1 className="text-4xl font-bold font-headline">{t('aboutPage.title')}</h1>
        <p className="text-lg text-muted-foreground">
          {t('aboutPage.subtitle')}
        </p>
        
        <div className="space-y-4 text-secondary-foreground">
            <p>
              {t('aboutPage.p1')}
            </p>
            <p>
              {t('aboutPage.p2')}
            </p>
            <p>
              {t('aboutPage.p3')}
            </p>
        </div>
      </div>
    </main>
  );
}
