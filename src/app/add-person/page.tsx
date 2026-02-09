'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { LoginButton } from '@/components/auth/LoginButton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const personSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  description: z.string().min(10, 'Description is too short.').max(1000, 'Description is too long.'),
  category: z.enum(['celebrity', 'politician', 'public_figure', 'other']),
  image: z.string().optional(),
  wearsGlasses: z.boolean().default(false),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Please select a gender.' }),
  birthday: z.date().optional(),
  firstKiss: z.string().optional(),
  schools: z.string().optional(),
  friends: z.string().optional(),
  twitter: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  instagram: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  facebook: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  google: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
});

type PersonFormValues = z.infer<typeof personSchema>;
const categories = ['celebrity', 'politician', 'public_figure', 'other'] as const;

export default function AddPersonPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'other',
      wearsGlasses: false,
      image: '',
      facebook: '',
      google: '',
      instagram: '',
      twitter: '',
      website: '',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('image', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: PersonFormValues) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to add a person.', variant: 'destructive' });
      return;
    }

    startTransition(() => {
      const uploadAndSubmit = async () => {
        let imageUrl = '';
        if (data.image) {
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: data.image }),
            });
            const result = await res.json();
            if (!res.ok) {
              throw new Error(result.error || 'Image upload failed');
            }
            imageUrl = result.url;
          } catch (error) {
            console.error('Error uploading image:', error);
            toast({ title: 'Error', description: 'Image upload failed. Please try again.', variant: 'destructive' });
            return;
          }
        }

        const personData = {
          name: data.name,
          description: data.description,
          category: data.category,
          photoUrl: imageUrl || null,
          verified: false,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          wearsGlasses: data.wearsGlasses,
          gender: data.gender,
          birthday: data.birthday ? Timestamp.fromDate(data.birthday) : null,
          firstKiss: data.firstKiss || null,
          schools: data.schools ? data.schools.split(',').map(s => s.trim()) : [],
          friends: data.friends ? data.friends.split(',').map(f => f.trim()) : [],
          externalLinks: {
            twitter: data.twitter || null,
            instagram: data.instagram || null,
            website: data.website || null,
            facebook: data.facebook || null,
            google: data.google || null,
          },
        };
        
        const personCollectionRef = collection(db, 'persons');

        addDoc(personCollectionRef, personData)
          .then(() => {
            toast({ title: 'Success', description: `${data.name} has been added.` });
            router.push('/');
          })
          .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
              path: personCollectionRef.path,
              operation: 'create',
              requestResourceData: personData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      };
      uploadAndSubmit();
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
                    <CardDescription>You need to be logged in to add a new person.</CardDescription>
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
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <UserPlus /> Add a New Person
          </CardTitle>
          <CardDescription>
            Contribute to the database by adding a new person. Please provide as much accurate information as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Who are they? What are they known for?" {...field} /></FormControl><FormMessage /></FormItem>
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
                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem><FormLabel>Photo</FormLabel>
                    <FormControl><Input type="file" accept="image/*" onChange={handleImageChange} className="pt-2 text-sm"/></FormControl>
                    {imagePreview && <Image src={imagePreview} alt="Preview" width={100} height={100} className="mt-2 rounded-md object-cover" />}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Personal Details</h3>
                 <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Gender</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel className="font-normal">Other</FormLabel></FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )} />
                <FormField control={form.control} name="birthday" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Birthday</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="wearsGlasses" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Wears Glasses?</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                 )} />
                <FormField control={form.control} name="firstKiss" render={({ field }) => (
                  <FormItem><FormLabel>First Kiss Story</FormLabel><FormControl><Textarea placeholder="Any details about their first kiss..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

               <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Relationships & Education</h3>
                <FormField control={form.control} name="schools" render={({ field }) => (
                  <FormItem><FormLabel>Schools Attended</FormLabel><FormControl><Textarea placeholder="List schools separated by a comma (e.g., Springfield Elementary, Shelbyville High)" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="friends" render={({ field }) => (
                    <FormItem><FormLabel>Known Friends</FormLabel><FormControl><Textarea placeholder="List names of friends, separated by a comma" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
               </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Social Accounts</h3>
                <FormField control={form.control} name="twitter" render={({ field }) => (
                  <FormItem><FormLabel>Twitter URL</FormLabel><FormControl><Input placeholder="https://twitter.com/janedoe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input placeholder="https://instagram.com/janedoe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="facebook" render={({ field }) => (
                  <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input placeholder="https://facebook.com/janedoe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://janedoe.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="google" render={({ field }) => (
                  <FormItem><FormLabel>Google Account Email</FormLabel><FormControl><Input placeholder="jane.doe@gmail.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Person
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
