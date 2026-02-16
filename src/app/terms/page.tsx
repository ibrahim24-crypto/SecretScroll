'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold font-headline">Terms of Use</h1>
        <p className="text-lg text-muted-foreground">
          Please read our terms of use carefully.
        </p>
        
        <div className="space-y-4 text-secondary-foreground">
            <p>
            By accessing or using SecretReels, you agree to be bound by these terms of use.
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">1. Content Responsibility</h2>
            <p>
            You are solely responsible for the content you post. You agree not to post any content that is illegal, defamatory, hateful, or that infringes on any third-party rights, including intellectual property and privacy rights. We are not responsible for any content, including pictures or personal details, that you may find on this platform. The content shared here is not published by us, and we do not endorse it.
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">2. User Conduct</h2>
             <p>
            You agree to use the service responsibly and not to engage in any activity that could harm the service or its users. This includes, but is not limited to, harassment, spamming, and attempting to gain unauthorized access to the system.
            </p>
            <h2 className="text-2xl font-semibold font-headline pt-4">3. Termination</h2>
            <p>
            We may terminate or suspend your access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
        </div>
      </div>
    </main>
  );
}
