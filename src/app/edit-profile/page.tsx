'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { useState, useEffect, useTransition } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const profileSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters.').max(50, 'Display name is too long.'),
  bio: z.string().max(160, 'Bio is too long.').optional(),
  externalLinks: z.object({
    twitter: z.string().url().optional().or(z.literal('')),
    github: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        displayName: '',
        bio: '',
        externalLinks: {
            twitter: '',
            github: '',
            instagram: '',
            website: ''
        }
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        externalLinks: {
            twitter: userProfile.externalLinks?.twitter || '',
            github: userProfile.externalLinks?.github || '',
            instagram: userProfile.externalLinks?.instagram || '',
            website: userProfile.externalLinks?.website || '',
        }
      });
    }
  }, [userProfile, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to update your profile.', variant: 'destructive' });
      return;
    }

    startTransition(() => {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
          displayName: data.displayName,
          bio: data.bio,
          externalLinks: data.externalLinks,
      }
      updateDoc(userRef, updateData)
        .then(() => {
          toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
          router.push(`/profile/${user.uid}`);
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updateData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  if (authLoading) {
    return <div className="container flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <main className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Edit Your Profile</CardTitle>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl><Input placeholder="Your display name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl><Textarea placeholder="Tell us a little about yourself" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Social Links</h3>
                <div className="space-y-4">
                     <FormField control={form.control} name="externalLinks.twitter" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Twitter URL</FormLabel>
                        <FormControl><Input placeholder="https://twitter.com/username" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="externalLinks.github" render={({ field }) => (
                        <FormItem>
                        <FormLabel>GitHub URL</FormLabel>
                        <FormControl><Input placeholder="https://github.com/username" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="externalLinks.instagram" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl><Input placeholder="https://instagram.com/username" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="externalLinks.website" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl><Input placeholder="https://yourwebsite.com" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
