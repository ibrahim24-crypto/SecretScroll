'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Post, PostImage } from '@/lib/types';
import { isSocialPlatform, getSocialPlatformIcon } from '@/lib/socials';
import { Skeleton } from '@/components/ui/skeleton';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  content: z.string().optional(),
  category: z.enum(['funny', 'deep', 'random', 'advice']).optional(),
  eventDate: z.date().optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
  customFields: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;
const categories = ['funny', 'deep', 'random', 'advice'] as const;


export default function EditPostPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrls: [],
      customFields: [],
      category: undefined,
      eventDate: undefined,
    },
  });
  
  useEffect(() => {
    if (!postId || !user) return;

    const fetchPost = async () => {
      setLoading(true);
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);

        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() } as Post;

          if (postData.authorUid !== user.uid) {
            toast({ title: "Unauthorized", description: "You can only edit your own posts.", variant: "destructive" });
            router.push('/');
            return;
          }

          setPost(postData);
          const defaultValues: Partial<PostFormValues> = {
              title: postData.title,
              content: postData.content,
              category: postData.category,
              eventDate: postData.eventDate ? postData.eventDate.toDate() : null,
              customFields: postData.customFields || [],
              imageUrls: postData.images?.map(img => img.url) || [],
          };
          form.reset(defaultValues);
          setImagePreviews(defaultValues.imageUrls || []);
        } else {
          toast({ title: "Not Found", description: "This post does not exist.", variant: "destructive" });
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching post for editing:", error);
        toast({ title: "Error", description: "Could not load post data.", variant: "destructive" });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchPost();
    }
  }, [postId, user, router, toast, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customFields"
  });
  
  const watchedCustomFields = form.watch('customFields');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsUploading(true);
    const uploadPromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
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
                    resolve(uploadResult.url);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(uploadPromises)
        .then(urls => {
            const currentUrls = form.getValues('imageUrls') || [];
            const newUrls = [...currentUrls, ...urls];
            form.setValue('imageUrls', newUrls);
            setImagePreviews(newUrls);
        })
        .catch(error => {
            console.error('Error uploading images:', error);
            toast({ title: 'Error', description: 'One or more images failed to upload.', variant: 'destructive' });
        })
        .finally(() => {
            setIsUploading(false);
        });
  };

  const removeImage = (indexToRemove: number) => {
    const currentUrls = form.getValues('imageUrls') || [];
    const newUrls = currentUrls.filter((_, index) => index !== indexToRemove);
    form.setValue('imageUrls', newUrls);
    setImagePreviews(newUrls);
  };

  const onSubmit = (data: PostFormValues) => {
    if (!post) return;

    startTransition(async () => {
      let isFlagged = post.isFlagged;
      const contentToCheck = `${data.title} ${data.content || ''}`;

      if (contentToCheck.trim()) {
        try {
          const checkRes = await fetch('/api/check-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: contentToCheck }),
          });

          if (checkRes.ok) {
            const { flagged, badWords } = await checkRes.json();
            if (flagged && badWords && badWords.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Inappropriate Content Detected",
                    description: `Please remove the following word(s) before saving: ${badWords.join(", ")}`,
                    duration: 9000,
                });
                return; // Block submission
            }
            isFlagged = flagged;
          } else {
            isFlagged = true;
          }
        } catch (error) {
          isFlagged = true;
          console.error("Error checking content, flagging post for review:", error);
        }
      }

      const postRef = doc(db, 'posts', post.id);

      // Determine new images vs existing images
      const existingImages = post.images || [];
      const currentImageUrls = data.imageUrls || [];

      const newImages: PostImage[] = currentImageUrls.map(url => {
          const existing = existingImages.find(img => img.url === url);
          // If image already exists, keep its status. If it's new, set to 'pending'.
          return existing ? existing : { url, status: 'pending' as const };
      });

      const hasPendingImages = newImages.some(img => img.status === 'pending');

      const updatedData = {
        title: data.title,
        content: data.content,
        category: data.category,
        eventDate: data.eventDate ? Timestamp.fromDate(data.eventDate) : null,
        customFields: data.customFields,
        images: newImages,
        hasPendingImages: hasPendingImages,
        isFlagged: isFlagged,
        updatedAt: serverTimestamp(),
      };
      
      const cleanUpdatedData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
      );
      
      try {
        await updateDoc(postRef, cleanUpdatedData);
        toast({ title: 'Post Updated!', description: 'Your changes have been saved.' });
        router.push(`/post/${post.id}`);
      } catch (serverError) {
        console.error("Error updating post: ", serverError);
        const permissionError = new FirestorePermissionError({
          path: postRef.path,
          operation: 'update',
          requestResourceData: cleanUpdatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    });
  };

  if (loading) {
    return (
        <div className="container py-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-background md:h-auto md:bg-transparent">
        {/* Header for mobile */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-2 border-b bg-background md:hidden">
            <Button variant="ghost" size="icon" asChild>
                <Link href={`/post/${postId}`}>
                    <ArrowLeft />
                </Link>
            </Button>
            <h1 className="text-lg font-semibold">Edit Post</h1>
            <Button form="edit-post-form" type="submit" size="sm" disabled={isPending || isUploading}>
              {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto md:container md:py-8">
            <div className="max-w-2xl mx-auto p-4 md:p-0">
                {/* Header for Desktop */}
                <header className="hidden md:flex items-center justify-between mb-6">
                    <Button variant="ghost" asChild>
                        <Link href={`/post/${postId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Post
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-headline font-bold">Edit Post</h1>
                    <Button form="edit-post-form" type="submit" disabled={isPending || isUploading}>
                      {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                </header>
                
                <Form {...form}>
                  <form id="edit-post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., A funny thing happened today..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem><FormLabel>Content (Optional)</FormLabel><FormControl><Textarea placeholder="Share your story, thought, or confession." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('_', ' ')}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Event Date (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={
                                field.value instanceof Date
                                  ? `${field.value.getFullYear()}-${String(
                                      field.value.getMonth() + 1
                                    ).padStart(2, '0')}-${String(
                                      field.value.getDate()
                                    ).padStart(2, '0')}`
                                  : ''
                              }
                              onChange={(e) => {
                                if (e.target.value) {
                                  const [year, month, day] = e.target.value
                                    .split('-')
                                    .map(Number);
                                  field.onChange(
                                    new Date(year, month - 1, day)
                                  );
                                } else {
                                  field.onChange(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            If your post is about an event, add the date.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField control={form.control} name="imageUrls" render={() => (
                      <FormItem>
                        <FormLabel>Images</FormLabel>
                        <FormDescription>Manage your post's images. New images will require admin approval.</FormDescription>
                        <FormControl><Input type="file" accept="image/*" onChange={handleImageChange} disabled={isUploading} className="pt-2 text-sm" multiple /></FormControl>
                        {isUploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>}
                        {imagePreviews.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                              {imagePreviews.map((preview, index) => (
                                  <div key={index} className="relative aspect-square">
                                      <Image src={preview} alt="Image Preview" fill className="rounded-md object-cover" />
                                      <Button type="button" variant="destructive" size="icon" className="absolute -top-1 -right-1 h-6 w-6 rounded-full" onClick={() => removeImage(index)} disabled={isUploading}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                  </div>
                              ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <div className="space-y-4 rounded-lg border p-4">
                        <FormLabel className="text-base">Custom Details</FormLabel>
                        <FormDescription>Add or edit other details.</FormDescription>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md relative">
                                    <FormField control={form.control} name={`customFields.${index}.label`} render={({ field: controllerField }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className="text-xs">Label</FormLabel>
                                            <FormControl><Input placeholder="e.g., Instagram, First Kiss" {...controllerField} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <Controller
                                        control={form.control}
                                        name={`customFields.${index}.value`}
                                        render={({ field: controllerField }) => {
                                            const currentLabel = watchedCustomFields?.[index]?.label || '';
                                            const isSocial = isSocialPlatform(currentLabel);
                                            const Icon = getSocialPlatformIcon(currentLabel);

                                            return (
                                                <FormItem className="flex-1">
                                                    <FormLabel className="text-xs">Value</FormLabel>
                                                    <div className="relative flex items-center">
                                                        {isSocial && Icon && (
                                                            <div className="absolute left-3">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <FormControl>
                                                          <Input
                                                            placeholder={isSocial ? 'username' : 'e.g., at the park...'}
                                                            className={cn(isSocial && 'pl-10')}
                                                            {...controllerField}
                                                          />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0"><X className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ label: "", value: "" })}><Plus className="mr-2 h-4 w-4" />Add Detail</Button>
                    </div>
                  </form>
                </Form>
            </div>
        </main>
    </div>
  );
}
