'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusSquare, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { LoginButton } from '@/components/auth/LoginButton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const postSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100, 'Title is too long.'),
  content: z.string().min(10, 'Content is too short.').max(2000, 'Content is too long.'),
  category: z.enum(['funny', 'deep', 'random', 'advice']),
  imageUrl: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;
const categories = ['funny', 'deep', 'random', 'advice'] as const;

export default function CreatePostPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'random',
      imageUrl: '',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadstart = () => setIsUploading(true);
      reader.onloadend = async () => {
        const result = reader.result as string;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: result }),
          });
          const uploadResult = await res.json();
          if (!res.ok) {
            throw new Error(uploadResult.error || 'Image upload failed');
          }
          form.setValue('imageUrl', uploadResult.url);
          setImagePreview(uploadResult.url);
        } catch (error) {
          console.error('Error uploading image:', error);
          toast({ title: 'Error', description: 'Image upload failed. Please try again.', variant: 'destructive' });
          setImagePreview(null);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', '');
  };

  const onSubmit = (data: PostFormValues) => {
    if (!user || !userProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create a post.', variant: 'destructive' });
      return;
    }

    startTransition(() => {
      const postData = {
        ...data,
        authorUid: user.uid,
        authorDisplayName: userProfile.displayName || 'Anonymous',
        authorPhotoURL: userProfile.photoURL || null,
        visibility: 'public',
        upvotes: 0,
        downvotes: 0,
        reports: 0,
        status: 'pending', // All posts must be approved
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const postCollectionRef = collection(db, 'posts');

      addDoc(postCollectionRef, postData)
        .then(() => {
          toast({ title: 'Post Submitted!', description: `Your post is pending review.` });
          router.push('/');
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: postCollectionRef.path,
            operation: 'create',
            requestResourceData: postData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  if (authLoading) {
    return <div className="container flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) {
    return (
        <div className="container flex flex-col items-center justify-center py-12 gap-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Login Required</CardTitle>
                    <CardDescription>You need to be logged in to create a post.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginButton />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <main className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <PlusSquare /> Create a New Post
          </CardTitle>
          <CardDescription>
            Share something about yourself. Your post will be reviewed before it goes public.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., A funny thing happened today..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Share your story, thought, or confession." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={() => (
                <FormItem><FormLabel>Optional Image</FormLabel>
                  <FormControl><Input type="file" accept="image/*" onChange={handleImageChange} disabled={isUploading} className="pt-2 text-sm"/></FormControl>
                  {isUploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>}
                  {imagePreview && (
                    <div className="relative w-48 h-48 mt-2">
                        <Image src={imagePreview} alt="Image Preview" fill className="rounded-md object-cover" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeImage} disabled={isUploading}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || isUploading}>
                  {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Review
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
