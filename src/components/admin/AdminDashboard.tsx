'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, doc, orderBy, deleteDoc, where, writeBatch, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile, AppSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trash2, UserPlus, X, Search, ShieldCheck, ShieldOff, Check, Ban } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';


// #region Post Manager
function PostManager({ settings }: { settings: AppSettings | null }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('');
    const [showFlagged, setShowFlagged] = useState(false);
    const { toast } = useToast();

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            let postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            
            // Manual flagging based on current settings
            if (settings?.forbiddenWords) {
                postsData = postsData.map(post => {
                    const content = `${post.title} ${post.content}`.toLowerCase();
                    const isFlagged = settings.forbiddenWords.some(word => content.includes(word.toLowerCase()));
                    return { ...post, isFlagged };
                });
            }
            
            setPosts(postsData);
        } catch (error) {
           console.error("Error fetching posts:", error);
           toast({ title: 'Error', description: 'Could not fetch posts.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
    }, [toast, settings]);

    useEffect(() => {
      fetchPosts();
    }, [fetchPosts]);

    const handleDeletePost = (postId: string) => {
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
        .filter(post => post.title.toLowerCase().includes(filter.toLowerCase()) || post.content.toLowerCase().includes(filter.toLowerCase()))
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
                filteredPosts.map(post => (
                    <Card key={post.id} className={cn(post.isFlagged && "border-destructive")}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                {post.title}
                                {post.isFlagged && <Badge variant="destructive">Flagged</Badge>}
                            </CardTitle>
                            <CardDescription>By Anonymous on {post.createdAt.toDate().toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent><p className="p-3 bg-muted rounded-md line-clamp-3">{post.content}</p></CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={updating[post.id]}>
                                {updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the post.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)}>{updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
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

    const fetchPendingImages = useCallback(async () => {
        setLoading(true);
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where('imagesStatus', '==', 'pending'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);
        } catch (error) {
           console.error("Error fetching posts for approval:", error);
           toast({ title: 'Error', description: 'Could not fetch posts for approval.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
      fetchPendingImages();
    }, [fetchPendingImages]);

    const handleImageDecision = (postId: string, decision: 'approved' | 'rejected') => {
        setUpdating(prev => ({ ...prev, [postId]: true }));
        const postRef = doc(db, 'posts', postId);
        
        updateDoc(postRef, { imagesStatus: decision })
          .then(() => {
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: 'Success', description: `Images have been ${decision}.` });
          })
          .catch((error) => {
            const permissionError = new FirestorePermissionError({ path: postRef.path, operation: 'update' });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setUpdating(prev => ({ ...prev, [postId]: false }));
          });
    }

    if (loading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}</div>
    }

    if (posts.length === 0) {
        return <p className="text-muted-foreground text-center py-12">No images are pending review.</p>;
    }

    return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
                <Card key={post.id}>
                    <CardHeader><CardTitle>{post.title}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                           {post.imageUrls?.map(url => <Image key={url} src={url} alt={post.title} width={200} height={200} className="rounded-md object-cover aspect-square" />)}
                        </div>
                        <p className="p-3 bg-muted rounded-md mt-4 text-sm">{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleImageDecision(post.id, 'rejected')} disabled={updating[post.id]}>
                             {updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="mr-2 h-4 w-4" /> Reject</>}
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleImageDecision(post.id, 'approved')} disabled={updating[post.id]}>
                            {updating[post.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> Approve</>}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
// #endregion

// #region Admin Manager
function AdminManager() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [admins, setAdmins] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'admin'));
            const querySnapshot = await getDocs(q);
            setAdmins(querySnapshot.docs.map(d => d.data() as UserProfile));
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch admins.'});
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
                await updateDoc(doc(db, 'users', adminId), { role: 'user' });
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
                                   {user?.uid !== admin.uid && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" disabled={isPending}><ShieldOff className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Revoke Admin?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove admin privileges for {admin.email}?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => removeAdmin(admin.uid)}>Revoke</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                   )}
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
function SettingsManager({ settings, onUpdate }: { settings: AppSettings | null, onUpdate: () => void }) {
    const { toast } = useToast();
    const [newWord, setNewWord] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleAddWord = () => {
        if (!newWord.trim()) return;
        startTransition(async () => {
            const currentWords = settings?.forbiddenWords || [];
            if(currentWords.includes(newWord.toLowerCase())) {
                toast({title: "Word already exists.", variant: 'default' });
                return;
            }
            const newWords = [...currentWords, newWord.trim().toLowerCase()];
            try {
                await setDoc(doc(db, 'settings', 'config'), { forbiddenWords: newWords }, { merge: true });
                toast({ title: "Success", description: "Forbidden word list updated." });
                setNewWord('');
                onUpdate();
            } catch (error) {
                 const permissionError = new FirestorePermissionError({ path: `settings/config`, operation: 'update' });
                 errorEmitter.emit('permission-error', permissionError);
            }
        });
    }

    const handleRemoveWord = (wordToRemove: string) => {
        startTransition(async () => {
            const newWords = settings?.forbiddenWords.filter(w => w !== wordToRemove) || [];
            try {
                await setDoc(doc(db, 'settings', 'config'), { forbiddenWords: newWords }, { merge: true });
                toast({ title: "Success", description: `"${wordToRemove}" removed from list.` });
                onUpdate();
            } catch (error) {
                 const permissionError = new FirestorePermissionError({ path: `settings/config`, operation: 'update' });
                 errorEmitter.emit('permission-error', permissionError);
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Forbidden Words</CardTitle>
                <CardDescription>Posts containing these words will be flagged for review. Words are not case-sensitive.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-4">
                    <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Add a word..." />
                    <Button onClick={handleAddWord} disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!settings && <Skeleton className="h-20 w-full" />}
                    {settings?.forbiddenWords.length === 0 && <p className="text-sm text-muted-foreground">No forbidden words yet.</p>}
                    {settings?.forbiddenWords.map(word => (
                        <Badge key={word} variant="secondary" className="text-base font-normal">
                            {word}
                            <button onClick={() => handleRemoveWord(word)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                        </Badge>
                    ))}
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
        const settingsRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
        } else {
            // Create initial settings if they don't exist
            await setDoc(settingsRef, { forbiddenWords: [] });
            setSettings({ forbiddenWords: [] });
        }
    } catch (e) {
        console.error("Failed to fetch or create settings", e);
    } finally {
        setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && userProfile?.role === 'admin') {
      fetchSettings();
    }
  }, [userProfile, authLoading, fetchSettings, toast]);

  useEffect(() => {
    if (!authLoading && (!userProfile || userProfile.role !== 'admin')) {
        toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive' });
        router.push('/');
    }
  }, [userProfile, authLoading, router, toast]);

  if (authLoading || loadingSettings) {
    return <div className="container py-8"><Skeleton className="h-96 w-full" /></div>;
  }
  
  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="posts">Manage Posts</TabsTrigger>
        <TabsTrigger value="images">Image Approval</TabsTrigger>
        <TabsTrigger value="admins">Manage Admins</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="posts" className="mt-4">
        <PostManager settings={settings} />
      </TabsContent>
      <TabsContent value="images" className="mt-4">
        <ImageApprovalQueue />
      </TabsContent>
      <TabsContent value="admins" className="mt-4">
        <AdminManager />
      </TabsContent>
       <TabsContent value="settings" className="mt-4">
        <SettingsManager settings={settings} onUpdate={fetchSettings} />
      </TabsContent>
    </Tabs>
  );
}
