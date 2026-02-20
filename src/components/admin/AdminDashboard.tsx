'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, doc, orderBy, deleteDoc, where, writeBatch, updateDoc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile, AppSettings, PostImage, Permission, AdminPermissions } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trash2, UserPlus, X, Search, ShieldCheck, ShieldOff, Check, Ban, Settings } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const PERMISSIONS_CONFIG: { id: Permission; label: string; description: string }[] = [
    { id: 'approve_pictures', label: 'Picture Approval', description: 'Can approve or reject user-submitted pictures.' },
    { id: 'delete_posts', label: 'Post Deletion', description: 'Can delete any post from the feed.' },
    { id: 'delete_comments', label: 'Comment Deletion', description: 'Can delete any comment from any post.' },
    { id: 'manage_admins', label: 'Admin Management', description: 'Can grant or revoke admin privileges and permissions.' },
    { id: 'delete_users', label: 'User Deletion', description: 'Can delete any user account from the application.' },
    { id: 'manage_forbidden_words', label: 'Word Filter', description: 'Can manage the list of forbidden words.' },
    { id: 'manage_protected_names', label: 'Protected Names', description: 'Manage a list of protected names to block from post titles.' },
];

const permissionsSchema = z.object({
  permissions: z.array(z.string()).optional(),
});

function PermissionsDialog({ admin, onUpdate, children }: { admin: UserProfile; onUpdate: () => void; children: React.ReactNode }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      permissions: Object.keys(admin.permissions || {}).filter(key => admin.permissions?.[key as Permission]),
    },
  });

  const onSubmit = (data: { permissions: string[] }) => {
    startTransition(async () => {
      const newPermissions = PERMISSIONS_CONFIG.reduce((acc, p) => {
        acc[p.id] = data.permissions.includes(p.id);
        return acc;
      }, {} as AdminPermissions);

      try {
        await updateDoc(doc(db, 'users', admin.uid), { permissions: newPermissions });
        toast({ title: 'Success!', description: `${admin.email}'s permissions have been updated.` });
        onUpdate(); // Refresh admin list in parent
      } catch (error) {
        const permissionError = new FirestorePermissionError({ path: `users/${admin.uid}`, operation: 'update' });
        errorEmitter.emit('permission-error', permissionError);
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Permissions for {admin.displayName}</DialogTitle>
          <DialogDescription>Select the permissions to grant to this admin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <div className="space-y-4">
                  {PERMISSIONS_CONFIG.map((p) => (
                    <div key={p.id} className="flex items-start rounded-md border p-4">
                      <Checkbox
                        id={p.id}
                        checked={field.value?.includes(p.id)}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...(field.value || []), p.id]
                            : (field.value || []).filter((v) => v !== p.id);
                          field.onChange(newValue);
                        }}
                      />
                      <div className="ml-3">
                        <Label htmlFor={p.id} className="font-medium">{p.label}</Label>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            />
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Permissions
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// #region Post Manager
function PostManager() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('');
    const [showFlagged, setShowFlagged] = useState(false);
    const { toast } = useToast();
    const { userProfile } = useAuth();

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);

            // Fetch unique authors
            const authorIds = [...new Set(postsData.map(p => p.authorUid).filter(id => id !== 'anonymous_guest'))];
            const fetchedAuthors: Record<string, UserProfile> = {};
            
            const authorPromises = authorIds.map(async (authorId) => {
                const userRef = doc(db, 'users', authorId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    fetchedAuthors[authorId] = userSnap.data() as UserProfile;
                }
            });
            await Promise.all(authorPromises);
            setAuthors(fetchedAuthors);

        } catch (error) {
           console.error("Error fetching posts:", error);
           toast({ title: 'Error', description: 'Could not fetch posts.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
      fetchPosts();
    }, [fetchPosts]);

    const handleDeletePost = (postId: string) => {
        if (!userProfile?.permissions?.delete_posts) {
            toast({ title: 'Permission Denied', variant: 'destructive'});
            return;
        }
        setUpdating(prev => ({ ...prev, [postId]: true }));
        const postRef = doc(db, 'posts', postId);
        
        deleteDoc(postRef)
          .then(() => {
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: 'Success', description: `Post has been deleted.` });
          })
          .catch((error) => {
            const permissionError = new FirestorePermissionError({ path: postRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setUpdating(prev => ({ ...prev, [postId]: false }));
          });
    }

    const filteredPosts = posts
        .filter(post => post.title.toLowerCase().includes(filter.toLowerCase()) || (post.content && post.content.toLowerCase().includes(filter.toLowerCase())))
        .filter(post => showFlagged ? post.isFlagged : true);

    return (
        <div className="space-y-4">
             <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search posts..." className="pl-8" value={filter} onChange={(e) => setFilter(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="show-flagged" checked={showFlagged} onCheckedChange={setShowFlagged} />
                        <Label htmlFor="show-flagged">Show Flagged Only</Label>
                    </div>
                </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-60 w-full" />) :
                filteredPosts.map(post => {
                    const author = authors[post.authorUid];
                    return (
                    <Card key={post.id} className={cn(post.isFlagged && "border-destructive")}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                {post.title}
                                {post.isFlagged && <Badge variant="destructive">Flagged</Badge>}
                            </CardTitle>
                             <CardDescription className="flex items-center gap-2 text-xs">
                                {author ? (
                                    <>
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={author.photoURL || undefined} />
                                            <AvatarFallback>{author.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <span>{author.displayName || author.email}</span>
                                    </>
                                ) : (
                                    <span>By {post.authorUid === 'anonymous_guest' ? 'Guest' : '...'}</span>
                                )}
                                <span>•</span>
                                <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent><p className="p-3 bg-muted rounded-md line-clamp-3">{post.content}</p></CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            {userProfile?.permissions?.delete_posts && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={updating[post.id]}>
                                    {updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the post.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePost(post.id)}>{updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </CardFooter>
                    </Card>
                )})}
            </div>
             {!loading && filteredPosts.length === 0 && <p className="text-center text-muted-foreground py-8">No posts found.</p>}
        </div>
    );
}
// #endregion

// #region Image Approval
function ImageApprovalQueue() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    const { userProfile } = useAuth();

    const fetchPendingImages = useCallback(async () => {
        setLoading(true);
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where('hasPendingImages', '==', true), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);
        } catch (error: any) {
           console.error("Error fetching posts for approval:", error);
           toast({ title: 'Error', description: 'Could not fetch posts for approval. You may need to create a Firestore index.', variant: 'destructive', duration: 10000 });
        } finally {
          setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
      fetchPendingImages();
    }, [fetchPendingImages]);

    const handleImageDecision = (postId: string, imageUrl: string, decision: 'approved' | 'rejected') => {
        if (!userProfile?.permissions?.approve_pictures) {
            toast({ title: 'Permission Denied', variant: 'destructive'});
            return;
        }
        setUpdating(prev => ({ ...prev, [imageUrl]: true }));
        const postRef = doc(db, 'posts', postId);

        runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw new Error("Post does not exist!");
            }

            const currentImages = (postDoc.data().images || []) as PostImage[];
            const newImages = currentImages.map(img =>
                img.url === imageUrl ? { ...img, status: decision } : img
            );
            
            const hasPending = newImages.some(img => img.status === 'pending');
            
            transaction.update(postRef, { images: newImages, hasPendingImages: hasPending });
            return hasPending;
        }).then((hasPending) => {
            toast({ title: 'Success', description: `Image has been ${decision}.` });
            
            setPosts(prevPosts => {
                const newPosts = prevPosts.map(p => {
                    if (p.id === postId) {
                        const updatedImages = p.images?.map(img => 
                            img.url === imageUrl ? { ...img, status: decision } : img
                        )
                        const stillHasPending = updatedImages?.some(i => i.status === 'pending');
                        return { ...p, images: updatedImages, hasPendingImages: stillHasPending };
                    }
                    return p;
                });
                return newPosts.filter(p => p.hasPendingImages);
            });
        }).catch((error) => {
            const permissionError = new FirestorePermissionError({ path: postRef.path, operation: 'update' });
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => {
            setUpdating(prev => ({ ...prev, [imageUrl]: false }));
        });
    };

    if (loading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}</div>
    }

    if (posts.length === 0) {
        return <p className="text-muted-foreground text-center py-12">No images are pending review.</p>;
    }

    return (
         <div className="grid gap-4 md:grid-cols-2">
            {posts.map(post => {
                const pendingImages = post.images?.filter(img => img.status === 'pending');
                if (!pendingImages || pendingImages.length === 0) return null;
                
                return (
                    <Card key={post.id}>
                        <CardHeader>
                            <CardTitle>{post.title}</CardTitle>
                            <CardDescription>{pendingImages.length} image(s) to review for this post.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                           {pendingImages.map((image, index) => (
                               <div key={index} className="relative group aspect-square">
                                   <Image src={image.url} alt={post.title} fill className="rounded-md object-cover" />
                                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Button size="icon" variant="destructive" onClick={() => handleImageDecision(post.id, image.url, 'rejected')} disabled={updating[image.url]}>
                                           {updating[image.url] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-4 w-4" />}
                                           <span className="sr-only">Reject</span>
                                       </Button>
                                       <Button size="icon" variant="default" onClick={() => handleImageDecision(post.id, image.url, 'approved')} disabled={updating[image.url]}>
                                          {updating[image.url] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                          <span className="sr-only">Approve</span>
                                       </Button>
                                   </div>
                               </div>
                           ))}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
// #endregion

// #region User Manager
function UserManager() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingUser, setDeletingUser] = useState<string | null>(null);
    const { toast } = useToast();
    const { user: currentUser, userProfile } = useAuth();


    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            setUsers(usersData);
        } catch (error: any) {
           console.error("Error fetching users:", error);
           if (error.code === 'permission-denied') {
             toast({ title: 'Permission Denied', description: 'You do not have permission to view users.', variant: 'destructive' });
           } else if (error.code === 'failed-precondition') {
             toast({ title: 'Missing Index', description: 'A database index is required to view users. Please check the console for a creation link.', variant: 'destructive', duration: 10000 });
           } else {
             toast({ title: 'Error', description: 'Could not fetch users.', variant: 'destructive' });
           }
        } finally {
          setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleDeleteUser = (userToDelete: UserProfile) => {
        if (!userProfile?.permissions?.delete_users) {
            toast({ title: 'Permission Denied', description: 'You do not have permission to delete users.', variant: 'destructive' });
            return;
        }
        if (userToDelete.uid === currentUser?.uid) {
            toast({ title: "Cannot delete yourself", variant: "destructive" });
            return;
        }

        setDeletingUser(userToDelete.uid);
        const userRef = doc(db, 'users', userToDelete.uid);
        
        deleteDoc(userRef)
          .then(() => {
            setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
            toast({ title: 'Success', description: `User ${userToDelete.displayName || userToDelete.email} has been deleted.` });
          })
          .catch((error) => {
            const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
              setDeletingUser(null);
          });
    }


    if (loading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map(user => (
                <Card key={user.uid}>
                    <CardHeader className="flex flex-row items-center gap-4 p-4">
                         <Avatar>
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                            <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-base">{user.displayName}</CardTitle>
                            <CardDescription className="text-xs break-all">{user.email}</CardDescription>
                        </div>
                         {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                    </CardHeader>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                         <p className="text-xs text-muted-foreground">
                            Joined: {user.createdAt ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                        </p>
                        {userProfile?.permissions?.delete_users && currentUser?.uid !== user.uid && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" disabled={deletingUser === user.uid}>
                                        {deletingUser === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the user account. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
// #endregion

// #region Admin Manager
function AdminManager() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const [admins, setAdmins] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const isSuperAdmin = user?.email === 'ibrahimezzine09@gmail.com';

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'admin'));
            const querySnapshot = await getDocs(q);
            setAdmins(querySnapshot.docs.map(d => ({...d.data(), uid: d.id } as UserProfile)));
        } catch (e: any) {
            console.error("Error fetching admins. This might be a missing Firestore index for the 'users' collection. Please check your browser's developer console for an index creation link.", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch admins. Check console.', duration: 8000});
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchAdmins() }, [fetchAdmins]);

    const form = useForm<{email: string}>({
        resolver: zodResolver(z.object({ email: z.string().email() })),
        defaultValues: { email: '' },
    });

    const onSubmit = (data: {email: string}) => {
        startTransition(async () => {
            try {
                const q = query(collection(db, 'users'), where('email', '==', data.email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    toast({ title: 'Error', description: 'User with that email does not exist.', variant: 'destructive'});
                    return;
                }
                
                const userDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
                
                toast({ title: 'Success!', description: `${data.email} has been made an admin.` });
                fetchAdmins(); // Refresh admin list
                form.reset();

            } catch (error: any) {
                 const permissionError = new FirestorePermissionError({ path: 'users', operation: 'update' });
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    }
     const removeAdmin = (adminId: string) => {
        startTransition(async () => {
            try {
                await updateDoc(doc(db, 'users', adminId), { role: 'user', permissions: {} });
                toast({ title: 'Success!', description: `Admin privileges have been revoked.` });
                fetchAdmins();
            } catch (error) {
                const permissionError = new FirestorePermissionError({ path: `users/${adminId}`, operation: 'update' });
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    }

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Admin</CardTitle>
                    <CardDescription>Enter a user's email to grant them admin privileges.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem className="flex-grow"><FormLabel>User Email</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Make Admin</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader><CardTitle>Current Admins</CardTitle></CardHeader>
                 <CardContent>
                    {loading ? <Skeleton className="h-20 w-full" /> : (
                        <ul className="space-y-2">
                           {admins.map(admin => (
                               <li key={admin.uid} className="flex items-center justify-between p-2 rounded-md border">
                                   <div>
                                       <p className="font-medium">{admin.displayName}</p>
                                       <p className="text-sm text-muted-foreground">{admin.email}</p>
                                   </div>
                                   <div className="flex items-center gap-2">
                                    {isSuperAdmin && user?.uid !== admin.uid && (
                                       <PermissionsDialog admin={admin} onUpdate={fetchAdmins}>
                                           <Button variant="outline" size="sm" disabled={isPending}><Settings className="h-4 w-4" /></Button>
                                       </PermissionsDialog>
                                    )}
                                    {isSuperAdmin && user?.uid !== admin.uid && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isPending}><ShieldOff className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Revoke Admin?</AlertDialogTitle>
                                                    <AlertDialogDescription>Are you sure you want to remove admin privileges for {admin.email}?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => removeAdmin(admin.uid)}>Revoke</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                   </div>
                               </li>
                           ))}
                        </ul>
                    )}
                 </CardContent>
            </Card>
        </div>
    );
}
// #endregion

// #region Settings Manager
function SettingsManager() {
    const [settings, setSettings] = useState<AppSettings>({ forbiddenWords: [] });
    const [loading, setLoading] = useState(true);
    const [newWord, setNewWord] = useState('');
    const [isUpdating, startTransition] = useTransition();
    const { toast } = useToast();
    const settingsRef = doc(db, 'settings', 'config');

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            } else {
                // If the doc doesn't exist, initialize it
                await setDoc(settingsRef, { forbiddenWords: [] });
                setSettings({ forbiddenWords: [] });
            }
        } catch (e) {
            console.error("Error fetching settings:", e);
            toast({ title: 'Error', description: 'Could not load settings.', variant: 'destructive'});
        } finally {
            setLoading(false);
        }
    }, [toast, settingsRef]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleAddWord = () => {
        startTransition(async () => {
            const word = newWord.trim().toLowerCase();
            if (!word) return;
            if (settings.forbiddenWords.includes(word)) {
                toast({ title: "Word already exists", description: `"${word}" is already in the list.`, variant: "default" });
                return;
            }

            const updatedWords = [...settings.forbiddenWords, word].sort();
            try {
                await setDoc(settingsRef, { forbiddenWords: updatedWords }, { merge: true });
                toast({ title: 'Success!', description: `The word "${word}" has been added.` });
                setSettings({ forbiddenWords: updatedWords }); // Update local state immediately
                setNewWord(''); // Clear input
            } catch (error) {
                const permissionError = new FirestorePermissionError({ path: settingsRef.path, operation: 'update', requestResourceData: { forbiddenWords: updatedWords }});
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    const handleRemoveWord = (wordToRemove: string) => {
        startTransition(async () => {
            const updatedWords = settings.forbiddenWords.filter(w => w !== wordToRemove);
            try {
                await setDoc(settingsRef, { forbiddenWords: updatedWords }, { merge: true });
                toast({ title: 'Success!', description: `The word "${wordToRemove}" has been removed.` });
                setSettings({ forbiddenWords: updatedWords }); // Update local state immediately
            } catch (error) {
                const permissionError = new FirestorePermissionError({ path: settingsRef.path, operation: 'update', requestResourceData: { forbiddenWords: updatedWords }});
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    if (loading) {
        return <Skeleton className="h-64 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Forbidden Words</CardTitle>
                <CardDescription>Add or remove words that should be blocked from posts and comments. Changes are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        value={newWord}
                        onChange={e => setNewWord(e.target.value)}
                        placeholder="Add a new word..."
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWord(); } }}
                        disabled={isUpdating}
                    />
                    <Button onClick={handleAddWord} disabled={isUpdating || !newWord.trim()}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Word
                    </Button>
                </div>
                <div className="border rounded-md p-4 space-y-2 h-64 overflow-y-auto">
                    {settings.forbiddenWords.length === 0 ? (
                        <p className="text-muted-foreground text-center">No forbidden words yet.</p>
                    ) : (
                         <div className="flex flex-wrap gap-2">
                            {settings.forbiddenWords.map(word => (
                                <Badge key={word} variant="secondary" className="flex items-center gap-1 text-base py-1">
                                    {word}
                                    <button onClick={() => handleRemoveWord(word)} disabled={isUpdating} className="rounded-full hover:bg-muted-foreground/20 p-0.5 ml-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
// #endregion

// #region Protected Names Manager
function ProtectedNamesManager() {
    const [protectedNames, setProtectedNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [isUpdating, startTransition] = useTransition();
    const { toast } = useToast();
    const settingsRef = doc(db, 'settings', 'protectedNames');

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                setProtectedNames(docSnap.data().names || []);
            } else {
                await setDoc(settingsRef, { names: [] });
                setProtectedNames([]);
            }
        } catch (e) {
            console.error("Error fetching protected names:", e);
            toast({ title: 'Error', description: 'Could not load protected names.', variant: 'destructive'});
        } finally {
            setLoading(false);
        }
    }, [toast, settingsRef]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleAddName = () => {
        startTransition(async () => {
            const name = newName.trim().toLowerCase();
            if (!name) return;
            if (protectedNames.includes(name)) {
                toast({ title: "Name already exists", description: `"${name}" is already in the list.`, variant: "default" });
                return;
            }

            const updatedNames = [...protectedNames, name].sort();
            try {
                await setDoc(settingsRef, { names: updatedNames }, { merge: true });
                toast({ title: 'Success!', description: `The name "${name}" has been protected.` });
                setProtectedNames(updatedNames);
                setNewName('');
            } catch (error) {
                const permissionError = new FirestorePermissionError({ path: settingsRef.path, operation: 'update', requestResourceData: { names: updatedNames }});
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    const handleRemoveName = (nameToRemove: string) => {
        startTransition(async () => {
            const updatedNames = protectedNames.filter(n => n !== nameToRemove);
            try {
                await setDoc(settingsRef, { names: updatedNames }, { merge: true });
                toast({ title: 'Success!', description: `The name "${nameToRemove}" is no longer protected.` });
                setProtectedNames(updatedNames);
            } catch (error) {
                const permissionError = new FirestorePermissionError({ path: settingsRef.path, operation: 'update', requestResourceData: { names: updatedNames }});
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    if (loading) {
        return <Skeleton className="h-64 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Protected Names</CardTitle>
                <CardDescription>Block posts if their title contains any of these names. This is case-insensitive. Changes are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Add a new name to protect..."
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddName(); } }}
                        disabled={isUpdating}
                    />
                    <Button onClick={handleAddName} disabled={isUpdating || !newName.trim()}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Name
                    </Button>
                </div>
                <div className="border rounded-md p-4 space-y-2 h-64 overflow-y-auto">
                    {protectedNames.length === 0 ? (
                        <p className="text-muted-foreground text-center">No protected names yet.</p>
                    ) : (
                         <div className="flex flex-wrap gap-2">
                            {protectedNames.map(name => (
                                <Badge key={name} variant="secondary" className="flex items-center gap-1 text-base py-1">
                                    {name}
                                    <button onClick={() => handleRemoveName(name)} disabled={isUpdating} className="rounded-full hover:bg-muted-foreground/20 p-0.5 ml-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
// #endregion

export function AdminDashboard() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const canViewDashboard = userProfile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !canViewDashboard) {
        toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive' });
        router.push('/');
    }
  }, [userProfile, authLoading, router, toast, canViewDashboard]);

  if (authLoading || !canViewDashboard) {
    return <div className="py-8"><Skeleton className="h-96 w-full" /></div>;
  }
  
  return (
    <Tabs defaultValue="posts" className="w-full">
      <div className="w-full overflow-x-auto border-b">
        <TabsList className="inline-flex">
          <TabsTrigger value="posts">Manage Posts</TabsTrigger>
          {userProfile?.permissions?.approve_pictures && <TabsTrigger value="images">Image Approval</TabsTrigger>}
          {userProfile?.role === 'admin' && <TabsTrigger value="users">Manage Users</TabsTrigger>}
          {userProfile?.permissions?.manage_admins && <TabsTrigger value="admins">Manage Admins</TabsTrigger>}
          {userProfile?.permissions?.manage_forbidden_words && <TabsTrigger value="settings">Word Filter</TabsTrigger>}
          {userProfile?.permissions?.manage_protected_names && <TabsTrigger value="names">Protected Names</TabsTrigger>}
        </TabsList>
      </div>
      <TabsContent value="posts" className="mt-4">
        <PostManager />
      </TabsContent>
       {userProfile?.permissions?.approve_pictures && (
         <TabsContent value="images" className="mt-4">
            <ImageApprovalQueue />
        </TabsContent>
       )}
       {userProfile?.role === 'admin' && (
        <TabsContent value="users" className="mt-4">
            <UserManager />
        </TabsContent>
       )}
       {userProfile?.permissions?.manage_admins && (
        <TabsContent value="admins" className="mt-4">
            <AdminManager />
        </TabsContent>
       )}
       {userProfile?.permissions?.manage_forbidden_words && (
        <TabsContent value="settings" className="mt-4">
          <SettingsManager />
        </TabsContent>
       )}
       {userProfile?.permissions?.manage_protected_names && (
        <TabsContent value="names" className="mt-4">
          <ProtectedNamesManager />
        </TabsContent>
       )}
    </Tabs>
  );
}
