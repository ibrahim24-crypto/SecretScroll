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
import { useLocale } from '@/hooks/useLocale';

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
  const { t } = useLocale();
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
            toast({ title: t('toasts.unauthorized'), description: t('toasts.unauthorizedEdit'), variant: "destructive" });
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
          toast({ title: t('toasts.notFound'), description: t('toasts.postNotFound'), variant: "destructive" });
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching post for editing:", error);
        toast({ title: t('toasts.error'), description: t('toasts.loadPostError'), variant: "destructive" });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchPost();
    }
  }, [postId, user, router, toast, form, t]);


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
            toast({ title: t('toasts.error'), description: 'One or more images failed to upload.', variant: 'destructive' });
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
      const contentToCheck = `${data.title} ${data.content || ''}`;

      if (contentToCheck.trim()) {
        try {
          // 1. Check against local forbidden words list first
          const settingsRef = doc(db, 'settings', 'global');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
              const forbiddenWords = settingsSnap.data().forbiddenWords as string[];
              const foundWords = forbiddenWords.filter(word => 
                  new RegExp(`\\b${word}\\b`, 'i').test(contentToCheck)
              );

              if (foundWords.length > 0) {
                  toast({
                      variant: "destructive",
                      title: t('toasts.inappropriateContent'),
                      description: t('toasts.inappropriateContentWords', { words: foundWords.join(", ") }),
                      duration: 9000,
                  });
                  return; // Block submission
              }
          }

          // 2. If local check passes, check against external API
          const checkRes = await fetch('/api/check-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: contentToCheck }),
          });

          if (!checkRes.ok) {
            toast({
              variant: "destructive",
              title: t('toasts.contentCheckError'),
              description: t('toasts.contentCheckErrorDescription'),
              duration: 9000,
            });
            return; // Block submission
          }

          const { flagged, badWords } = await checkRes.json();
          if (flagged) {
            if (badWords && badWords.length > 0) {
              toast({
                variant: "destructive",
                title: t('toasts.inappropriateContent'),
                description: t('toasts.inappropriateContentWords', {words: badWords.join(", ")}),
                duration: 9000,
              });
            } else {
              toast({
                variant: "destructive",
                title: t('toasts.inappropriateContent'),
                description: t('toasts.inappropriateContentDescription'),
                duration: 9000,
              });
            }
            return; // Block submission
          }
        } catch (error) {
          console.error("Error checking content:", error);
          toast({
            variant: "destructive",
            title: t('toasts.contentCheckError'),
            description: t('toasts.contentCheckConnectionError'),
            duration: 9000,
          });
          return; // Block submission
        }
      }
      
      const postRef = doc(db, 'posts', post.id);

      const existingImages = post.images || [];
      const currentImageUrls = data.imageUrls || [];

      const newImages: PostImage[] = currentImageUrls.map(url => {
          const existing = existingImages.find(img => img.url === url);
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
        isFlagged: false, // Content is clean if we reach here
        updatedAt: serverTimestamp(),
      };
      
      const cleanUpdatedData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
      );
      
      try {
        await updateDoc(postRef, cleanUpdatedData);
        toast({ title: t('toasts.postUpdated'), description: t('toasts.postUpdatedDescription') });
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
            <h1 className="text-lg font-semibold">{t('createPost.editTitle')}</h1>
            <Button form="edit-post-form" type="submit" size="sm" disabled={isPending || isUploading}>
              {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('buttons.save')}
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
                            {t('createPost.backToPost')}
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-headline font-bold">{t('createPost.editTitle')}</h1>
                    <Button form="edit-post-form" type="submit" disabled={isPending || isUploading}>
                      {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {t('buttons.saveChanges')}
                    </Button>
                </header>
                
                <Form {...form}>
                  <form id="edit-post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>{t('createPost.personNameLabel')}</FormLabel><FormControl><Input placeholder={t('createPost.personNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem><FormLabel>{t('createPost.descriptionLabel')}</FormLabel><FormControl><Textarea placeholder={t('createPost.descriptionPlaceholder')} {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('createPost.categoryLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('createPost.categoryPlaceholder')} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{t(`categories.${cat}`)}</SelectItem>)}
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
                          <FormLabel>{t('createPost.birthDateLabel')}</FormLabel>
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
                            {t('createPost.birthDateDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField control={form.control} name="imageUrls" render={() => (
                      <FormItem>
                        <FormLabel>{t('createPost.imagesLabel')}</FormLabel>
                        <FormDescription>{t('createPost.editImagesDescription')}</FormDescription>
                        <FormControl><Input type="file" accept="image/*" onChange={handleImageChange} disabled={isUploading} className="pt-2 text-sm" multiple /></FormControl>
                        {isUploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>{t('createPost.uploading')}</span></div>}
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
                        <FormLabel className="text-base">{t('createPost.customDetailsLabel')}</FormLabel>
                        <FormDescription>{t('createPost.editCustomDetailsDescription')}</FormDescription>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md relative">
                                    <FormField control={form.control} name={`customFields.${index}.label`} render={({ field: controllerField }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel className="text-xs">{t('createPost.customFieldLabel')}</FormLabel>
                                            <FormControl><Input placeholder={t('createPost.customFieldLabelPlaceholder')} {...controllerField} /></FormControl>
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
                                                    <FormLabel className="text-xs">{t('createPost.customFieldValue')}</FormLabel>
                                                    <div className="relative flex items-center">
                                                        {isSocial && Icon && (
                                                            <div className="absolute left-3">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <FormControl>
                                                          <Input
                                                            placeholder={isSocial ? t('createPost.customFieldValuePlaceholderSocial') : t('createPost.customFieldValuePlaceholder')}
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
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ label: "", value: "" })}><Plus className="mr-2 h-4 w-4" />{t('createPost.addDetail')}</Button>
                    </div>
                  </form>
                </Form>
            </div>
        </main>
    </div>
  );
}
