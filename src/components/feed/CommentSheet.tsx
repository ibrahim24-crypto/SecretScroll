'use client';

import { useState, useEffect, useTransition } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Comment as CommentType } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '../ui/scroll-area';

export function CommentSheet({ postId, children }: { postId: string, children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!postId) return;
    // The query was causing a crash because it required a composite index in Firestore.
    // Removed orderBy and will sort on the client instead to resolve the issue.
    // The ideal long-term solution is to create the index recommended in the browser console logs.
    const q = query(collection(db, 'comments'), where('postId', '==', postId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType));
      
      // Sort comments on the client by creation date, newest first.
      commentsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

      setComments(commentsData);
    }, (error) => {
        console.error("Error fetching comments:", error);
        toast({
            title: 'Could not load comments',
            description: 'There was an issue fetching the comments for this post. This may be due to a missing database index. Check the console for details.',
            variant: 'destructive',
            duration: 9000
        })
    });
    return () => unsubscribe();
  }, [postId, toast]);

  const handleAddComment = () => {
    if (newComment.trim() === '') return;
    
    startTransition(async () => {
        const postRef = doc(db, 'posts', postId);
        const commentCollectionRef = collection(db, 'comments');
        const commentData = {
            postId,
            content: newComment,
            createdAt: serverTimestamp(),
            userId: user ? user.uid : 'anonymous',
            authorDisplayName: user ? user.displayName : 'Anonymous',
        };

        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }
                
                transaction.set(doc(commentCollectionRef), commentData);
                
                const newCommentCount = (postDoc.data().commentCount || 0) + 1;
                transaction.update(postRef, { commentCount: newCommentCount });
            });
            setNewComment('');
        } catch(e) {
            console.error(e);
            toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
             const permissionError = new FirestorePermissionError({
                path: 'comments',
                operation: 'create',
                requestResourceData: commentData
             });
             errorEmitter.emit('permission-error', permissionError);
        }
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Comments ({comments.length})</SheetTitle>
          <SheetDescription className="sr-only">A list of comments for the current post.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet. Be the first to say something!</p>
            ) : (
                comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                           <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{comment.authorDisplayName || 'Anonymous'}</p>
                                <p className="text-xs text-muted-foreground">
                                    {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                </p>
                            </div>
                            <p className="text-sm text-secondary-foreground">{comment.content}</p>
                        </div>
                    </div>
                ))
            )}
          </div>
        </ScrollArea>
        <div className="p-4 bg-background border-t">
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[40px] max-h-24"
              rows={1}
            />
            <Button onClick={handleAddComment} disabled={isPending || newComment.trim() === ''} size="icon">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
