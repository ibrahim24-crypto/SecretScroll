'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Secret } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

export function AdminDashboard() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingSecrets, setPendingSecrets] = useState<Secret[]>([]);
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

      const fetchPendingSecrets = async () => {
        setLoading(true);
        const secretsRef = collection(db, 'secrets');
        const q = query(secretsRef, where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        const secrets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Secret));
        setPendingSecrets(secrets);
        setLoading(false);
      };

      fetchPendingSecrets();
    }
  }, [userProfile, authLoading, router, toast]);

  const handleUpdateStatus = async (secretId: string, status: 'approved' | 'rejected') => {
    setUpdating(prev => ({ ...prev, [secretId]: true }));
    try {
      const secretRef = doc(db, 'secrets', secretId);
      await updateDoc(secretRef, { status, updatedAt: new Date() });
      setPendingSecrets(prev => prev.filter(s => s.id !== secretId));
      toast({ title: 'Success', description: `Secret has been ${status}.` });
    } catch (error) {
      console.error('Error updating secret status:', error);
      toast({ title: 'Error', description: 'Failed to update secret status.', variant: 'destructive' });
    } finally {
      setUpdating(prev => ({ ...prev, [secretId]: false }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-12 w-full" /></CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (pendingSecrets.length === 0) {
    return <p className="text-muted-foreground">No pending secrets to review. Great job!</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pendingSecrets.map(secret => (
        <Card key={secret.id}>
          <CardHeader>
            <CardTitle>Pending Secret</CardTitle>
            <CardDescription>
              Submitted on: {secret.createdAt.toDate().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="p-3 bg-muted rounded-md">{secret.content}</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(secret.id, 'rejected')}
              disabled={updating[secret.id]}
            >
              {updating[secret.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />}
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleUpdateStatus(secret.id, 'approved')}
              disabled={updating[secret.id]}
            >
              {updating[secret.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
