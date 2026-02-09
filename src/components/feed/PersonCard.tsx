'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, ArrowUp, ArrowDown, Laugh, Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, runTransaction, collection, where, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface PostCardProps {
  post: Post;
}

const categoryIcons = {
    funny: <Laugh className="h-full w-full" />,
    deep: <Sparkles className="h-full w-full" />,
    random: <BookOpen className="h-full w-full" />,
    advice: <Lightbulb className="h-full w-full" />,
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
    <>
    {/* Mobile: Full-screen Reel view */}
    <div id={post.id} className="md:hidden relative h-dvh w-screen snap-start flex flex-col justify-end text-white bg-black">
      {/* Background Image/Carousel */}
      {post.imageUrls && post.imageUrls.length > 0 ? (
        <Carousel className="absolute inset-0 z-0">
          <CarouselContent>
            {post.imageUrls.map((url, index) => (
              <CarouselItem key={index}>
                <Image
                  src={url}
                  alt={`${post.title} image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
           {post.imageUrls.length > 1 && (
                <>
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-20" />
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-20" />
                </>
            )}
        </Carousel>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary via-background to-accent flex items-center justify-center p-16 text-primary-foreground/50">
            <div className="h-1/2 w-1/2">
                {categoryIcons[post.category]}
            </div>
        </div>
      )}

       {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

      {/* Content Overlay */}
      <div className="relative z-20 p-6 flex flex-col justify-end h-full">
         <div className="flex-grow"></div> {/* Spacer */}
        <CardHeader className="p-0 mb-4">
            <div className="flex items-center gap-3">
                <Link href={`/profile/${post.authorUid}`}>
                    <Avatar className="h-12 w-12 border-2 border-white">
                        <AvatarImage src={post.authorPhotoURL || ''} alt={post.authorDisplayName} />
                        <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                </Link>
                <div>
                    <Link href={`/profile/${post.authorUid}`} className="font-semibold text-lg hover:underline">{post.authorDisplayName}</Link>
                    <p className="text-sm text-neutral-300">{new Date(post.createdAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0 mb-4">
            <CardTitle className="font-headline text-2xl mb-2">{post.title}</CardTitle>
            {post.eventDate && (
            <p className="text-sm text-neutral-200 mb-2 font-medium">
                {format(post.eventDate.toDate(), 'PPP')}
            </p>
            )}
            <p className="text-neutral-100 leading-relaxed">{post.content}</p>
            {post.customFields && post.customFields.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-white/20 pt-4">
                    {post.customFields.map((field, index) => (
                        <div key={index} className="flex text-sm">
                            <span className="font-semibold text-neutral-300 mr-2">{field.label}:</span>
                            <span className="text-neutral-100 break-all">{field.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
         <CardFooter className="p-0 w-full flex justify-between items-center text-sm text-neutral-300">
            <Badge variant="secondary" className="capitalize">{post.category}</Badge>
            <div className="flex items-center justify-end space-x-2">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('upvote')}
                disabled={isVoting || !user}
                className={cn('flex items-center gap-1 text-white hover:text-white', post.userVote === 'upvote' && 'text-green-400 bg-green-400/20 hover:bg-green-400/30')}
                >
                <ArrowUp className="h-5 w-5" />
                <span>{post.upvotes}</span>
                </Button>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('downvote')}
                disabled={isVoting || !user}
                className={cn('flex items-center gap-1 text-white hover:text-white', post.userVote === 'downvote' && 'text-red-400 bg-red-400/20 hover:bg-red-400/30')}
                >
                <ArrowDown className="h-5 w-5" />
                <span>{post.downvotes}</span>
                </Button>
            </div>
        </CardFooter>
      </div>
    </div>


    {/* Desktop: Original Card view */}
    <Card id={`${post.id}-desktop`} className="hidden md:flex break-inside-avoid shadow-lg transform transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 flex-col">
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
      
      {post.imageUrls && post.imageUrls.length > 0 ? (
        <Carousel className="w-full">
            <CarouselContent>
                {post.imageUrls.map((url, index) => (
                    <CarouselItem key={index}>
                        <Image
                            src={url}
                            alt={`${post.title} image ${index + 1}`}
                            width={600}
                            height={400}
                            className="w-full object-cover aspect-[4/3]"
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>
            {post.imageUrls.length > 1 && (
                <>
                    <CarouselPrevious className="absolute left-2" />
                    <CarouselNext className="absolute right-2" />
                </>
            )}
        </Carousel>
      ) : (
        <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center p-8 text-muted-foreground/50">
            <div className="h-1/2 w-1/2">
             {categoryIcons[post.category]}
            </div>
        </div>
      )}
      
      <CardContent className="flex-grow pt-6">
        <CardTitle className="font-headline text-xl mb-2">{post.title}</CardTitle>
        {post.eventDate && (
          <p className="text-sm text-muted-foreground mb-2 font-medium">
            {format(post.eventDate.toDate(), 'PPP')}
          </p>
        )}
        <p className="text-secondary-foreground leading-relaxed">{post.content}</p>
        {post.customFields && post.customFields.length > 0 && (
            <div className="mt-4 space-y-2 border-t pt-4">
                {post.customFields.map((field, index) => (
                    <div key={index} className="flex text-sm">
                        <span className="font-semibold text-muted-foreground mr-2">{field.label}:</span>
                        <span className="text-secondary-foreground break-all">{field.value}</span>
                    </div>
                ))}
            </div>
        )}
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
    </>
  );
}
