'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Plus, PlusSquare, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { LoginButton } from '@/components/auth/LoginButton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const postSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100, 'Title is too long.'),
  content: z.string().min(10, 'Content is too short.').max(2000, 'Content is too long.'),
  category: z.enum(['funny', 'deep', 'random', 'advice']),
  eventDate: z.date().optional(),
  imageUrls: z.array(z.string()).optional(),
  customFields: z.array(z.object({
    label: z.string().min(1, "Label cannot be empty."),
    value: z.string().min(1, "Value cannot be empty."),
  })).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;
const categories = ['funny', 'deep', 'random', 'advice'] as const;

export default function CreatePostPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'random',
      imageUrls: [],
      customFields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customFields"
  });

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
    if (!user || !userProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create a post.', variant: 'destructive' });
      return;
    }

    startTransition(() => {
      const postData = {
        ...data,
        visibility: 'public' as const,
        eventDate: data.eventDate ? Timestamp.fromDate(data.eventDate) : null,
        authorUid: user.uid,
        authorDisplayName: userProfile.displayName || 'Anonymous',
        authorPhotoURL: userProfile.photoURL || null,
        upvotes: 0,
        downvotes: 0,
        reports: 0,
        status: 'approved' as const, // All posts are now auto-approved
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const postCollectionRef = collection(db, 'posts');

      addDoc(postCollectionRef, postData)
        .then(() => {
          toast({ title: 'Post Published!', description: `Your post is now live.` });
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
            Share something about yourself. Your post will be published immediately.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              </div>

               <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Optional Event Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    If your post is about a specific event, you can add the date here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

              <FormField control={form.control} name="imageUrls" render={() => (
                <FormItem><FormLabel>Optional Images</FormLabel>
                  <FormControl><Input type="file" accept="image/*" onChange={handleImageChange} disabled={isUploading} className="pt-2 text-sm" multiple /></FormControl>
                  {isUploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>}
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-2">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative w-32 h-32">
                                <Image src={preview} alt="Image Preview" fill className="rounded-md object-cover" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeImage(index)} disabled={isUploading}>
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
                  <FormDescription>Add other details about yourself (e.g., First Kiss, Favorite Movie).</FormDescription>
                  <div className="space-y-4">
                      {fields.map((field, index) => (
                          <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md relative">
                              <FormField
                                  control={form.control}
                                  name={`customFields.${index}.label`}
                                  render={({ field }) => (
                                      <FormItem className="flex-1">
                                          <FormLabel className="text-xs">Label</FormLabel>
                                          <FormControl>
                                              <Input placeholder="e.g., First Kiss" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name={`customFields.${index}.value`}
                                  render={({ field }) => (
                                      <FormItem className="flex-1">
                                          <FormLabel className="text-xs">Value</FormLabel>
                                          <FormControl>
                                              <Input placeholder="e.g., At the park..." {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0">
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                  </div>
                  <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => append({ label: "", value: "" })}
                  >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Detail
                  </Button>
              </div>


              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || isUploading}>
                  {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish Post
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
