'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { suggestPersonCategory } from '@/ai/flows/suggest-person-category';
import { Loader2, Sparkles, UserPlus } from 'lucide-react';

const personSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  description: z.string().min(10, 'Description is too short.'),
  category: z.enum(['celebrity', 'politician', 'public_figure', 'other']),
  photoUrl: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

type PersonFormValues = z.infer<typeof personSchema>;

const categories = ['celebrity', 'politician', 'public_figure', 'other'] as const;

export function AddPersonDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'other',
      photoUrl: '',
    },
  });

  const handleSuggestCategory = async () => {
    const name = form.getValues('name');
    const description = form.getValues('description');
    if (!name || !description) {
      toast({ title: 'Please enter a name and description first.', variant: 'destructive' });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestPersonCategory({ name, description });
      if (categories.includes(result.category as any)) {
        form.setValue('category', result.category as any);
        toast({ title: 'AI Suggestion', description: `We suggest the category: ${result.category.replace('_', ' ')}` });
      } else {
        toast({ title: 'Suggestion not applicable', description: `The AI suggested '${result.category}', which is not a valid option. Please select one manually.`, variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'AI suggestion failed', description: 'Could not get a suggestion. Please select a category manually.', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
    }
  };

  const onSubmit = (data: PersonFormValues) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to add a person.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      try {
        await addDoc(collection(db, 'persons'), {
          name: data.name,
          category: data.category,
          photoUrl: data.photoUrl || null,
          verified: false,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          externalLinks: {
            twitter: data.twitter || null,
            instagram: data.instagram || null,
            website: data.website || null,
          },
        });
        toast({ title: 'Success', description: `${data.name} has been added.` });
        form.reset();
        setOpen(false);
      } catch (error) {
        console.error('Error adding person:', error);
        toast({ title: 'Error', description: 'Failed to add person. Please try again.', variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Add a new person to the database. Provide as much detail as possible.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Who are they? What are they known for?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex items-end gap-2">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem className="flex-grow">
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
                <Button type="button" variant="outline" onClick={handleSuggestCategory} disabled={isSuggesting}>
                  {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                </Button>
            </div>
            <FormField control={form.control} name="photoUrl" render={({ field }) => (
                <FormItem><FormLabel>Photo URL</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Person
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
