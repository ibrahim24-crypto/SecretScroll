'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, runTransaction, collection, where, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post: initialPost }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState(initialPost);
  const [isVoting, setIsVoting] = useState(false);
  
  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({ title: 'Please sign in to vote.', variant: 'destructive' });
      return;
    }
    if (isVoting) return;

    setIsVoting(true);

    const postRef = doc(db, 'posts', post.id);
    const voteCollectionRef = collection(db, 'votes');
    const existingVoteQuery = query(voteCollectionRef, where('userId', '==', user.uid), where('postId', '==', post.id));

    try {
      const existingVoteSnapshot = await getDocs(existingVoteQuery);
      const existingVoteDoc = existingVoteSnapshot.docs[0];
      const currentVote = existingVoteDoc?.data().type;

      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";

        let upvoteIncrement = 0;
        let downvoteIncrement = 0;
        let newVoteState: 'upvote' | 'downvote' | null = null;
        
        if (currentVote === voteType) { // Undoing vote
          if (voteType === 'upvote') upvoteIncrement = -1;
          else downvoteIncrement = -1;
          newVoteState = null;
          if (existingVoteDoc) transaction.delete(existingVoteDoc.ref);
        } else if (currentVote) { // Changing vote
          if (voteType === 'upvote') {
            upvoteIncrement = 1;
            downvoteIncrement = -1;
          } else {
            upvoteIncrement = -1;
            downvoteIncrement = 1;
          }
          newVoteState = voteType;
          if (existingVoteDoc) transaction.update(existingVoteDoc.ref, { type: voteType });
        } else { // New vote
          if (voteType === 'upvote') upvoteIncrement = 1;
          else downvoteIncrement = 1;
          newVoteState = voteType;
          const newVoteRef = doc(collection(db, 'votes'));
          transaction.set(newVoteRef, {
            postId: post.id,
            userId: user.uid,
            type: voteType,
            createdAt: new Date(),
          });
        }
        
        const newUpvotes = postDoc.data().upvotes + upvoteIncrement;
        const newDownvotes = postDoc.data().downvotes + downvoteIncrement;
        transaction.update(postRef, { upvotes: newUpvotes, downvotes: newDownvotes });

        setPost(prev => ({ ...prev, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newVoteState }));
      });
    } catch (e) {
      console.error(e);
      const permissionError = new FirestorePermissionError({
          path: postRef.path,
          operation: 'update',
          requestResourceData: { vote: voteType },
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsVoting(false);
    }
  };


  return (
    <Card id={post.id} className="break-inside-avoid shadow-lg transform transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Link href={`/profile/${post.authorUid}`}>
                <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={post.authorPhotoURL || ''} alt={post.authorDisplayName} />
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                </Avatar>
            </Link>
            <div>
                <Link href={`/profile/${post.authorUid}`} className="font-semibold hover:underline">{post.authorDisplayName}</Link>
                <p className="text-xs text-muted-foreground">{new Date(post.createdAt.seconds * 1000).toLocaleDateString()}</p>
            </div>
        </div>
      </CardHeader>
      
      {post.imageUrl && (
        <Image
            src={post.imageUrl}
            alt={post.title}
            width={600}
            height={400}
            className="w-full object-cover"
        />
      )}
      
      <CardContent className="flex-grow pt-6">
        <CardTitle className="font-headline text-xl mb-2">{post.title}</CardTitle>
        <p className="text-secondary-foreground leading-relaxed">{post.content}</p>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-4">
        <div className="w-full flex justify-between items-center text-sm text-muted-foreground">
            <Badge variant="secondary" className="capitalize">{post.category}</Badge>
            <div className="flex items-center justify-end space-x-2">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('upvote')}
                disabled={isVoting || !user}
                className={cn('flex items-center gap-1', post.userVote === 'upvote' && 'text-primary bg-primary/10')}
                >
                <ArrowUp className="h-4 w-4" />
                <span>{post.upvotes}</span>
                </Button>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('downvote')}
                disabled={isVoting || !user}
                className={cn('flex items-center gap-1', post.userVote === 'downvote' && 'text-destructive bg-destructive/10')}
                >
                <ArrowDown className="h-4 w-4" />
                <span>{post.downvotes}</span>
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
