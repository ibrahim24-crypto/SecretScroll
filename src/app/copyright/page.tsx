'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CopyrightPage() {
  return (
    <main className="container py-8 max-w-4xl mx-auto px-4">
       <header className="flex items-center justify-between mb-8">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </header>

      <div className="space-y-6">
        <h1 className="text-4xl font-bold font-headline">Copyright Policy</h1>
        <p className="text-lg text-muted-foreground">
          Respecting intellectual property.
        </p>
        
        <div className="space-y-4 text-secondary-foreground">
            <p>
            SecretReels respects the intellectual property rights of others and expects its users to do the same. It is our policy, in appropriate circumstances and at our discretion, to disable and/or terminate the accounts of users who repeatedly infringe the copyrights or other intellectual property rights of others.
            </p>
            <p>
            If you are a copyright owner, or are authorized to act on behalf of one, or authorized to act under any exclusive right under copyright, please report alleged copyright infringements taking place on or through the Site by completing a DMCA Notice of Alleged Infringement and delivering it to our designated Copyright Agent.
            </p>
            <p>
            Upon receipt of the Notice as described below, SecretReels will take whatever action, in its sole discretion, it deems appropriate, including removal of the challenged material from the Site.
            </p>
        </div>
      </div>
    </main>
  );
}
