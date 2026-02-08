'use client';

import { useState } from 'react';
import type { Secret } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, runTransaction, collection, where, getDocs, query, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface SecretViewProps {
  secret: Secret;
}

export function SecretView({ secret: initialSecret }: SecretViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [secret, setSecret] = useState(initialSecret);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({ title: 'Please sign in to vote.', variant: 'destructive' });
      return;
    }
    if (isVoting) return;

    setIsVoting(true);

    const secretRef = doc(db, 'secrets', secret.id);
    const voteCollectionRef = collection(db, 'votes');
    const existingVoteQuery = query(voteCollectionRef, where('userId', '==', user.uid), where('secretId', '==', secret.id));

    try {
      await runTransaction(db, async (transaction) => {
        const secretDoc = await transaction.get(secretRef);
        if (!secretDoc.exists()) throw "Secret does not exist!";

        const existingVoteSnapshot = await getDocs(existingVoteQuery);
        const existingVoteDoc = existingVoteSnapshot.docs[0];
        const currentVote = secret.userVote;

        let upvoteIncrement = 0;
        let downvoteIncrement = 0;
        let newVoteState: 'upvote' | 'downvote' | null = null;
        
        const batch = writeBatch(db);

        if (currentVote === voteType) { // Undoing vote
          if (voteType === 'upvote') upvoteIncrement = -1;
          else downvoteIncrement = -1;
          newVoteState = null;
          if (existingVoteDoc) batch.delete(existingVoteDoc.ref);
        } else if (currentVote) { // Changing vote
          if (voteType === 'upvote') {
            upvoteIncrement = 1;
            downvoteIncrement = -1;
          } else {
            upvoteIncrement = -1;
            downvoteIncrement = 1;
          }
          newVoteState = voteType;
          if (existingVoteDoc) batch.update(existingVoteDoc.ref, { type: voteType });
        } else { // New vote
          if (voteType === 'upvote') upvoteIncrement = 1;
          else downvoteIncrement = 1;
          newVoteState = voteType;
          const newVoteRef = doc(collection(db, 'votes'));
          batch.set(newVoteRef, {
            secretId: secret.id,
            userId: user.uid,
            type: voteType,
            createdAt: new Date(),
          });
        }
        
        await batch.commit();

        const newUpvotes = secretDoc.data().upvotes + upvoteIncrement;
        const newDownvotes = secretDoc.data().downvotes + downvoteIncrement;
        transaction.update(secretRef, { upvotes: newUpvotes, downvotes: newDownvotes });

        setSecret(prev => ({
          ...prev,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newVoteState
        }));
      });
    } catch (e) {
      console.error("Vote transaction failed: ", e);
      toast({ title: 'Vote failed', description: 'Could not record your vote. Please try again.', variant: 'destructive' });
    } finally {
      setIsVoting(false);
    }
  };


  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <p className="text-secondary-foreground leading-relaxed">{secret.content}</p>
      <div className="flex items-center justify-end space-x-2 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('upvote')}
          disabled={isVoting || !user}
          className={cn('flex items-center gap-1', secret.userVote === 'upvote' && 'text-primary bg-primary/10')}
        >
          <ArrowUp className="h-4 w-4" />
          <span>{secret.upvotes}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('downvote')}
          disabled={isVoting || !user}
          className={cn('flex items-center gap-1', secret.userVote === 'downvote' && 'text-destructive bg-destructive/10')}
        >
          <ArrowDown className="h-4 w-4" />
          <span>{secret.downvotes}</span>
        </Button>
      </div>
    </div>
  );
}
