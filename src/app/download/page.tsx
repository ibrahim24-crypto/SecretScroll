'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export default function DownloadPage() {
  const { t } = useLocale();
  return (
    <main className="container py-8 max-w-4xl mx-auto px-4">
       <header className="flex items-center justify-between mb-8">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('buttons.back') || 'Back'}
          </Link>
        </Button>
      </header>

      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold font-headline">{t('downloadPage.title') || 'Download Secret Scroll'}</h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          {t('downloadPage.subtitle') || 'Get the official Android app to access all features on the go.'}
        </p>
        
        <div className="pt-8">
          <Button asChild size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
            <a href="/secretscroll.apk" download="SecretScroll.apk">
              <Download className="mr-2 h-6 w-6" />
              {t('downloadPage.downloadButton') || 'Download APK'}
            </a>
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground pt-4">
          {t('downloadPage.instructions') || 'After downloading, you may need to allow "Install from unknown sources" in your device settings.'}
        </p>
      </div>
    </main>
  );
}
