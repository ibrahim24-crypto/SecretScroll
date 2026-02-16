'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, Plus, X, ArrowLeft, Instagram, Facebook, Github, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import type { PostImage } from '@/lib/types';
import { getSocialPlatformIcon } from '@/lib/socials';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { XIcon } from '@/components/icons/XIcon';


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
const categories = ['funny', 'deep', 'random', 'advice'] as const;

const socialButtons = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'username' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'username or profile ID' },
    { key: 'twitter', label: 'X / Twitter', icon: XIcon, placeholder: 'username' },
    { key: 'whatsapp', label: 'WhatsApp', icon: WhatsappIcon, placeholder: 'number with country code' },
    { key: 'github', label: 'GitHub', icon: Github, placeholder: 'username' },
    { key: 'website', label: 'Website', icon: LinkIcon, placeholder: 'https://example.com' },
];


export default function CreatePostPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);

  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [currentSocial, setCurrentSocial] = useState<{ key: string; label: string; icon: any; placeholder: string; } | null>(null);
  const [socialValue, setSocialValue] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const settingsRef = doc(db, 'settings', 'config');
            const docSnap = await getDoc(settingsRef);
            if(docSnap.exists()) {
                setForbiddenWords(docSnap.data().forbiddenWords || []);
            }
        } catch (error) {
            console.error("Could not fetch settings", error);
        }
    };
    fetchSettings();
  }, []);

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

  const handleOpenSocialDialog = (social: typeof socialButtons[number]) => {
    setCurrentSocial(social);
    setSocialValue('');
    setSocialDialogOpen(true);
  };

  const handleSaveSocial = () => {
    if (currentSocial && socialValue.trim()) {
        const exists = fields.some(field => field.label.toLowerCase() === currentSocial.label.toLowerCase());
        if(exists){
             toast({ title: 'Already added', description: `You have already added a link for ${currentSocial.label}.` });
             setSocialDialogOpen(false);
             return;
        }
        append({ label: currentSocial.label, value: socialValue.trim() });
        setSocialDialogOpen(false);
        setCurrentSocial(null);
    } else {
        toast({ title: 'Field is empty', description: 'Please enter a value to save.', variant: 'destructive' });
    }
  };
  
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
    startTransition(() => {
        const contentToCheck = `${data.title} ${data.content || ''}`.toLowerCase();
        const flagged = forbiddenWords.some(word => contentToCheck.includes(word.toLowerCase()));
        if(flagged) {
            toast({ title: 'Post contains forbidden words', description: 'Please revise your post content.', variant: 'destructive' });
            return;
        }

      const images: PostImage[] | null = data.imageUrls && data.imageUrls.length > 0 
        ? data.imageUrls.map(url => ({ url, status: 'pending' as const })) 
        : null;

      const hasPendingImages = !!images;

      const postData = {
        title: data.title,
        content: data.content,
        category: data.category,
        eventDate: data.eventDate ? Timestamp.fromDate(data.eventDate) : null,
        customFields: data.customFields,
        images: images,
        hasPendingImages: hasPendingImages,
        authorUid: user ? user.uid : "anonymous_guest",
        visibility: 'public' as const,
        isFlagged: false, 
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
          toast({ title: 'Post Published!', description: `Your post is now live.` });
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
            <h1 className="text-lg font-semibold">Create a Post</h1>
            <Button form="create-post-form" type="submit" size="sm" disabled={isPending || isUploading}>
              {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
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
                            Back to Feed
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-headline font-bold">Create a Post</h1>
                    <Button form="create-post-form" type="submit" disabled={isPending || isUploading}>
                      {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Publish
                    </Button>
                </header>
                
                <Form {...form}>
                  <form id="create-post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Person Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Share some details about this person." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
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
                          <FormLabel>Birth Date (Optional)</FormLabel>
                          <FormControl>
                             <Input
                              type="date"
                              className="w-full"
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription>
                            The person's date of birth.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField control={form.control} name="imageUrls" render={() => (
                      <FormItem>
                        <FormLabel>Images (Optional)</FormLabel>
                        <FormDescription>Images will be reviewed by an admin before they are visible.</FormDescription>
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
                        <FormLabel className="text-base">Social Links (Optional)</FormLabel>
                        <FormDescription>Add links to social media profiles or websites.</FormDescription>

                        {/* Display added links */}
                        <div className="space-y-2">
                            {fields.map((field, index) => {
                                const Icon = getSocialPlatformIcon(field.label);
                                return (
                                    <div key={field.id} className="flex items-center justify-between gap-2 p-2 border rounded-md bg-secondary/30">
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{field.label}</span>
                                                <span className="text-sm text-muted-foreground break-all">{field.value}</span>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Buttons to add new links */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {socialButtons.map((social) => (
                                <Button key={social.key} type="button" variant="outline" size="sm" onClick={() => handleOpenSocialDialog(social)}>
                                    <social.icon className="mr-2 h-4 w-4" />
                                    Add {social.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                  </form>
                </Form>
            </div>
        </main>
        <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add {currentSocial?.label}</DialogTitle>
                    <DialogDescription>
                        Enter the {currentSocial?.label} {currentSocial?.key === 'website' ? 'URL' : 'username or ID'} below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        id="social-value"
                        value={socialValue}
                        onChange={(e) => setSocialValue(e.target.value)}
                        placeholder={currentSocial?.placeholder}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setSocialDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveSocial}>Save Link</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
