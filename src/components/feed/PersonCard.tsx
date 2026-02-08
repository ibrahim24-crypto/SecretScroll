'use client';

import Image from 'next/image';
import type { Person, Secret } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { SecretView } from './SecretView';
import { AddSecretDialog } from '../forms/AddSecretDialog';
import { Verified, Twitter, Instagram, Globe } from 'lucide-react';
import { Badge } from '../ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface PersonCardProps {
  person: Person;
  secrets: Secret[];
}

export function PersonCard({ person, secrets }: PersonCardProps) {
  const placeholderImage = PlaceHolderImages.find(img => img.id === 'person-1') || PlaceHolderImages[0];

  return (
    <Card className="break-inside-avoid shadow-lg transform transition-transform duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center gap-4">
        <Image
          src={person.photoUrl || placeholderImage.imageUrl}
          alt={person.name}
          width={80}
          height={80}
          className="rounded-full border-2 border-primary"
          data-ai-hint={placeholderImage.imageHint}
        />
        <div className="flex-grow">
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            {person.name}
            {person.verified && <Verified className="h-5 w-5 text-primary" />}
          </CardTitle>
          <Badge variant="secondary" className="mt-1 capitalize">{person.category.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {secrets.length > 0 ? (
          secrets.map((secret) => <SecretView key={secret.id} secret={secret} />)
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No secrets revealed for {person.name} yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center space-x-2 text-muted-foreground">
          {person.externalLinks?.twitter && <a href={person.externalLinks.twitter} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 hover:text-primary" /></a>}
          {person.externalLinks?.instagram && <a href={person.externalLinks.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5 hover:text-primary" /></a>}
          {person.externalLinks?.website && <a href={person.externalLinks.website} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 hover:text-primary" /></a>}
        </div>
        <AddSecretDialog personId={person.id} personName={person.name} />
      </CardFooter>
    </Card>
  );
}
