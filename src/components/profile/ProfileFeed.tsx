'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Secret, Person } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface ProfileFeedProps {
    userId: string;
}

type SecretWithPerson = Secret & { person?: Person };

export function ProfileFeed({ userId }: ProfileFeedProps) {
    const [secrets, setSecrets] = useState<SecretWithPerson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserSecrets = async () => {
            setLoading(true);
            const secretsRef = collection(db, 'secrets');
            const q = query(secretsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const secretsData = await Promise.all(
                querySnapshot.docs.map(async (docSnap) => {
                    const secret = { id: docSnap.id, ...docSnap.data() } as Secret;
                    const personRef = doc(db, 'persons', secret.personId);
                    const personSnap = await getDoc(personRef);
                    if (personSnap.exists()) {
                        return { ...secret, person: { id: personSnap.id, ...personSnap.data() } as Person };
                    }
                    return secret;
                })
            );

            setSecrets(secretsData);
            setLoading(false);
        };
        fetchUserSecrets();
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
    
    if (secrets.length === 0) {
        return <p className="text-muted-foreground">This user has not submitted any secrets yet.</p>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {secrets.map(secret => (
                <Card key={secret.id}>
                    <CardHeader>
                        <CardTitle>
                            Secret about <Link href={`/#${secret.personId}`} className="text-primary hover:underline">{secret.person?.name || 'a person'}</Link>
                        </CardTitle>
                        <CardDescription className="flex justify-between items-center">
                            <span>Submitted on {secret.createdAt.toDate().toLocaleDateString()}</span>
                            <Badge variant={secret.status === 'approved' ? 'default' : 'secondary'} className="capitalize">{secret.status}</Badge>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="p-3 bg-muted rounded-md">{secret.content}</p>
                        <div className="flex justify-end text-sm text-muted-foreground mt-2 space-x-4">
                            <span>Upvotes: {secret.upvotes}</span>
                            <span>Downvotes: {secret.downvotes}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
