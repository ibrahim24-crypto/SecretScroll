'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, ArrowLeft, Instagram, Facebook, Github, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import type { PostImage } from '@/lib/types';
import { getSocialPlatformIcon, isSocialPlatform } from '@/lib/socials';
import { cn } from '@/lib/utils';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { XIcon } from '@/components/icons/XIcon';
import { useLocale } from '@/hooks/useLocale';


const postSchema = z.object({
  title: z.string().min(1, 'Name is required.'),
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

const socialButtons = [
    { label: 'Instagram', icon: Instagram },
    { label: 'X / Twitter', icon: XIcon },
    { label: 'Facebook', icon: Facebook },
    { label: 'WhatsApp', icon: WhatsappIcon },
    { label: 'GitHub', icon: Github },
    { label: 'Discord', icon: MessageSquare },
    { label: 'Website', icon: LinkIcon }
];


export default function CreatePostPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLocale();
  const router = useRouter();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const categories = ['funny', 'deep', 'random', 'advice'] as const;

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrls: [],
      customFields: [],
    },
  });

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
    startTransition(async () => {
      // 1. Check against protected names list
      try {
          const protectedNamesRef = doc(db, 'settings', 'protectedNames');
          const protectedNamesSnap = await getDoc(protectedNamesRef);
          if (protectedNamesSnap.exists()) {
              const protectedNames = protectedNamesSnap.data().names as string[];
              const titleLower = data.title.toLowerCase();
              const titleReversedLower = titleLower.split('').reverse().join('');

              const foundProtectedName = protectedNames.find(name => 
                  titleLower.includes(name.toLowerCase()) || titleReversedLower.includes(name.toLowerCase())
              );

              if (foundProtectedName) {
                  toast({
                      variant: "destructive",
                      title: "Post Blocked",
                      description: `The title contains a protected name or a variation of it: "${foundProtectedName}". Please change the title.`,
                      duration: 9000,
                  });
                  return; // Block submission
              }
          }
      } catch (error) {
          console.error("Error checking protected names:", error);
          // Don't block submission if this check fails, but log it.
      }


      const contentToCheck = `${data.title} ${data.content || ''}`;

      if (contentToCheck.trim()) {
        try {
          // 2. Check against local forbidden words list first
          const settingsRef = doc(db, 'settings', 'config');
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

          // 3. If local check passes, check against external API
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

      const images: PostImage[] | null = data.imageUrls && data.imageUrls.length > 0
        ? data.imageUrls.map(url => ({ url, status: 'pending' as const }))
        : null;

      const hasPendingImages = !!images;

      const filteredCustomFields = data.customFields?.filter(
        field => field.label.trim() !== '' && field.value.trim() !== ''
      );

      const postData = {
        title: data.title,
        content: data.content,
        category: data.category,
        eventDate: data.eventDate ? Timestamp.fromDate(data.eventDate) : null,
        customFields: filteredCustomFields,
        images: images,
        hasPendingImages: hasPendingImages,
        authorUid: user ? user.uid : "anonymous_guest",
        visibility: 'public' as const,
        isFlagged: false, // Content is clean if we reach here
        upvotes: 0,
        downvotes: 0,
        reports: 0,
        commentCount: 0,
        status: 'approved' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const cleanPostData = Object.fromEntries(
        Object.entries(postData).filter(([_, v]) => v !== undefined && v !== null)
      );

      const postCollectionRef = collection(db, 'posts');

      addDoc(postCollectionRef, cleanPostData)
        .then(() => {
          toast({ title: t('toasts.postPublished'), description: t('toasts.postPublishedDescription') });
          router.push('/');
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: postCollectionRef.path,
            operation: 'create',
            requestResourceData: cleanPostData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  return (
    <div className="flex flex-col h-dvh bg-background md:h-auto md:bg-transparent">
        {/* Header for mobile */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-2 border-b bg-background md:hidden">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft />
                </Link>
            </Button>
            <h1 className="text-lg font-semibold">{t('createPost.title')}</h1>
            <Button form="create-post-form" type="submit" size="sm" disabled={isPending || isUploading}>
              {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('buttons.publish')}
            </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto md:container md:py-8">
            <div className="max-w-2xl mx-auto p-4 md:p-0">
                {/* Header for Desktop */}
                <header className="hidden md:flex items-center justify-between mb-6">
                    <Button variant="ghost" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('createPost.backToFeed')}
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-headline font-bold">{t('createPost.title')}</h1>
                    <Button form="create-post-form" type="submit" disabled={isPending || isUploading}>
                      {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('buttons.publish')}
                    </Button>
                </header>
                
                <Form {...form}>
                  <form id="create-post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                              className="w-full"
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
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
                        <FormDescription>{t('createPost.imagesDescription')}</FormDescription>
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
                        <FormDescription>{t('createPost.customDetailsDescription')}</FormDescription>
                        
                        <div className="space-y-2 pt-2">
                            <p className="text-sm font-medium text-muted-foreground">{t('createPost.quickAddSocial')}</p>
                            <div className="flex flex-wrap gap-2">
                                {socialButtons.map(({ label, icon: Icon }) => (
                                    <Button key={label} type="button" variant="outline" size="sm" onClick={() => append({ label: label, value: "" })}>
                                        <Icon className="mr-2 h-4 w-4" />
                                        {label.split(' ')[0]}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {fields.length > 0 && <div className="pt-4 mt-4 border-t border-border" />}

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
                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ label: "", value: "" })}><Plus className="mr-2 h-4 w-4" />{t('createPost.addOtherDetail')}</Button>
                    </div>
                  </form>
                </Form>
            </div>
        </main>
    </div>
  );
}
