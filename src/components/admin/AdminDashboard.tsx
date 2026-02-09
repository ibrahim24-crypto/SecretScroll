'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trash2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

export function AdminDashboard() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!userProfile || userProfile.role !== 'admin') {
        toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive' });
        router.push('/');
        return;
      }

      const fetchPosts = async () => {
        setLoading(true);
        try {
          const postsRef = collection(db, 'posts');
          const q = query(postsRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
          setPosts(postsData);
        } catch (error) {
           console.error("Error fetching posts:", error);
           toast({ title: 'Error', description: 'Could not fetch posts.', variant: 'destructive' });
           const permissionError = new FirestorePermissionError({ path: 'posts', operation: 'list' });
           errorEmitter.emit('permission-error', permissionError);
        } finally {
          setLoading(false);
        }
      };

      fetchPosts();
    }
  }, [userProfile, authLoading, router, toast]);

  const handleDeletePost = (postId: string) => {
    setUpdating(prev => ({ ...prev, [postId]: true }));
    const postRef = doc(db, 'posts', postId);
    
    deleteDoc(postRef)
      .then(() => {
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast({ title: 'Success', description: `Post has been deleted.` });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: postRef.path,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setUpdating(prev => ({ ...prev, [postId]: false }));
      });
  }

  if (authLoading || loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-12 w-full" /></CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="text-muted-foreground">There are no posts in the application yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map(post => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <CardDescription>
              By {post.authorDisplayName} on {post.createdAt.toDate().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {post.imageUrls && post.imageUrls[0] && <Image src={post.imageUrls[0]} alt={post.title} width={400} height={300} className="rounded-md mb-4 w-full object-cover" />}
            <p className="p-3 bg-muted rounded-md">{post.content}</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={updating[post.id]}>
                  {updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the post.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                    {updating[post.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
