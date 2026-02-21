'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PatchNotesPage() {
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

      <div className="space-y-8">
        <div>
            <h1 className="text-4xl font-bold font-headline">{t('patchNotesPage.title')}</h1>
            <p className="text-lg text-muted-foreground">
              {t('patchNotesPage.subtitle')}
            </p>
        </div>
        
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('patchNotesPage.v3_title')}</CardTitle>
                    <CardDescription>
                        <Badge>Latest</Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-secondary-foreground">
                        <li>{t('patchNotesPage.v3_item1')}</li>
                        <li>{t('patchNotesPage.v3_item2')}</li>
                        <li>{t('patchNotesPage.v3_item3')}</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>{t('patchNotesPage.v2_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                     <ul className="list-disc list-inside space-y-2 text-secondary-foreground">
                        <li>{t('patchNotesPage.v2_item1')}</li>
                        <li>{t('patchNotesPage.v2_item2')}</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>{t('patchNotesPage.v1_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                     <ul className="list-disc list-inside space-y-2 text-secondary-foreground">
                        <li>{t('patchNotesPage.v1_item1')}</li>
                        <li>{t('patchNotesPage.v1_item2')}</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
