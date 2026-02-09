'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface ProfileFeedProps {
    userId: string;
}

export function ProfileFeed({ userId }: ProfileFeedProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserPosts = async () => {
            setLoading(true);
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where('authorUid', '==', userId), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

            setPosts(postsData);
            setLoading(false);
        };
        fetchUserPosts();
    }, [userId]);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/4 mt-1" />
                        </CardHeader>
                        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        );
    }
    
    if (posts.length === 0) {
        return <p className="text-muted-foreground">This user has not created any posts yet.</p>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {posts.map(post => (
                <Card key={post.id}>
                    <CardHeader>
                        <CardTitle>
                           <Link href={`/#${post.id}`} className="text-primary hover:underline">{post.title}</Link>
                        </CardTitle>
                        <CardDescription>
                            <span>Submitted on {post.createdAt.toDate().toLocaleDateString()}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="p-3 bg-muted rounded-md">{post.content}</p>
                        <div className="flex justify-end text-sm text-muted-foreground mt-2 space-x-4">
                            <span>Upvotes: {post.upvotes}</span>
                            <span>Downvotes: {post.downvotes}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
