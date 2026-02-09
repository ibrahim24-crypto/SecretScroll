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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const secretSchema = z.object({
  content: z.string().min(10, 'Secret must be at least 10 characters long.').max(500, 'Secret is too long.'),
});

type SecretFormValues = z.infer<typeof secretSchema>;

interface AddSecretDialogProps {
  personId: string;
  personName: string;
}

export function AddSecretDialog({ personId, personName }: AddSecretDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SecretFormValues>({
    resolver: zodResolver(secretSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = (data: SecretFormValues) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to add a secret.', variant: 'destructive' });
      return;
    }

    startTransition(() => {
      const secretData = {
        personId,
        userId: user.uid,
        content: data.content,
        upvotes: 0,
        downvotes: 0,
        reports: 0,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const secretsCollectionRef = collection(db, 'secrets');
      
      addDoc(secretsCollectionRef, secretData)
        .then(() => {
          toast({
            title: 'Secret Submitted',
            description: 'Your secret is now pending review by our moderators.',
          });
          form.reset();
          setOpen(false);
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
              path: secretsCollectionRef.path,
              operation: 'create',
              requestResourceData: secretData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!user}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Secret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Secret for {personName}</DialogTitle>
          <DialogDescription>
            Share a secret. It will be reviewed by moderators before being published.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`What's the secret about ${personName}?`}
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for Review
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
