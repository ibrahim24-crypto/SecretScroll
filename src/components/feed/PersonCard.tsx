'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Laugh, Sparkles, BookOpen, Lightbulb, MessageCircle, Images, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, runTransaction, collection, where, getDocs, query, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { CommentSheet } from './CommentSheet';
import { getSocialPlatformIcon, getSocialLink, isSocialPlatform } from '@/lib/socials';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PostCardProps {
  post: Post;
}

const categoryIcons = {
    funny: <Laugh className="h-full w-full" />,
    deep: <Sparkles className="h-full w-full" />,
    random: <BookOpen className="h-full w-full" />,
    advice: <Lightbulb className="h-full w-full" />,
}

function SocialLink({ field }: { field: { label: string, value: string } }) {
    const Icon = getSocialPlatformIcon(field.label);
    const href = getSocialLink(field.label, field.value);

    return (
        <Button asChild variant="ghost" size="sm" className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10 rounded-full h-8 px-3">
            <NextLink href={href} target="_blank" rel="noopener noreferrer">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{field.value}</span>
            </NextLink>
        </Button>
    )
}

function CustomField({ field }: { field: { label: string, value: string } }) {
    return (
        <div className="flex text-sm">
            <span className="font-semibold text-neutral-300 mr-2">{field.label}:</span>
            <span className="text-neutral-100 break-all">{field.value}</span>
        </div>
    )
}

export function PostCard({ post: initialPost }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);
  
  const isAuthor = user?.uid === post.authorUid;

  const handleDelete = async () => {
    if (!isAuthor) {
        toast({ title: 'Permission Denied', variant: 'destructive' });
        return;
    }
    setIsDeleting(true);
    try {
        await deleteDoc(doc(db, 'posts', post.id));
        toast({ title: 'Post Deleted', description: 'Your post has been successfully removed.' });
        // The real-time listener in Feed.tsx will handle removing the post from the UI.
    } catch (error) {
        console.error("Error deleting post:", error);
        const permissionError = new FirestorePermissionError({ path: `posts/${post.id}`, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };


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

  const approvedImages = post.images?.filter(img => img.status === 'approved').map(img => img.url) || [];

  const authorActionsMenu = (
    <div className="absolute top-2 right-2 z-30">
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white md:bg-transparent md:text-inherit md:hover:bg-accent">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(`/post/${post.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );

  return (
    <>
    {/* Mobile: Full-screen Reel view */}
    <div id={post.id} className="md:hidden relative h-dvh w-screen snap-start flex flex-col justify-end text-white bg-black">
      {isAuthor && authorActionsMenu}
      {/* Background Image/Carousel */}
      {approvedImages.length > 0 ? (
        <Carousel className="absolute inset-0 z-0" opts={{ loop: true }}>
          <CarouselContent>
            {approvedImages.map((url, index) => (
              <CarouselItem key={index} className="relative">
                <Image
                  src={url}
                  alt={`${post.title} image ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={index === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
           {approvedImages.length > 1 && (
                <>
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-20" />
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-20" />
                </>
            )}
        </Carousel>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary via-background to-accent flex items-center justify-center p-16 text-primary-foreground/50">
            <div className="h-1/2 w-1/2">
                {post.category && categoryIcons[post.category]}
            </div>
        </div>
      )}

       {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

      {/* Content Overlay */}
      <div className="relative z-20 p-6 flex flex-col justify-end h-full">
         <div className="flex-grow"></div> {/* Spacer */}
        <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
            {post.category && <Badge variant="secondary" className="capitalize">{post.category}</Badge>}
            <p className="text-sm text-neutral-300">{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
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
                <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex flex-wrap gap-2 mb-2">
                       {post.customFields.filter(f => isSocialPlatform(f.label)).map((field, index) => <SocialLink key={index} field={field} />)}
                    </div>
                     <div className="space-y-2">
                        {post.customFields.filter(f => !isSocialPlatform(f.label)).map((field, index) => <CustomField key={index} field={field} />)}
                    </div>
                </div>
            )}
        </CardContent>
         <CardFooter className="p-0 w-full flex justify-end items-center text-sm text-neutral-300">
            <div className="flex items-center justify-end space-x-2">
                {approvedImages.length > 0 && (
                    <Button asChild variant="ghost" size="sm" className="flex items-center gap-1 text-white hover:text-white">
                        <NextLink href={`/post/${post.id}`}>
                            <Images className="h-5 w-5" />
                            <span>{approvedImages.length}</span>
                        </NextLink>
                    </Button>
                )}
                 <CommentSheet postId={post.id}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 text-white hover:text-white">
                        <MessageCircle className="h-5 w-5" />
                        <span>{post.commentCount || 0}</span>
                    </Button>
                </CommentSheet>
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
    <Card id={`${post.id}-desktop`} className="hidden md:flex shadow-lg transform transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 flex-col relative">
       {isAuthor && <div className="absolute top-2 right-2 z-10">{authorActionsMenu}</div>}
       <CardHeader>
        <div className="flex items-center justify-between">
            {post.category && <Badge variant="secondary" className="capitalize">{post.category}</Badge>}
            <p className="text-xs text-muted-foreground">{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
        </div>
      </CardHeader>
      
      {approvedImages.length > 0 ? (
        <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
                {approvedImages.map((url, index) => (
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
            {approvedImages.length > 1 && (
                <>
                    <CarouselPrevious className="absolute left-2" />
                    <CarouselNext className="absolute right-2" />
                </>
            )}
        </Carousel>
      ) : (
        <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center p-8 text-muted-foreground/50">
            <div className="h-1/2 w-1/2">
             {post.category && categoryIcons[post.category]}
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
                <div className="flex flex-wrap gap-2 mb-2">
                    {post.customFields.filter(f => isSocialPlatform(f.label)).map((field, index) => {
                        const Icon = getSocialPlatformIcon(field.label);
                        const href = getSocialLink(field.label, field.value);
                        return (
                             <Button asChild key={index} variant="outline" size="sm" className="gap-2">
                                <NextLink href={href} target="_blank" rel="noopener noreferrer">
                                    <Icon className="h-4 w-4" />
                                    <span>{field.value}</span>
                                </NextLink>
                            </Button>
                        )
                    })}
                </div>
                {post.customFields.filter(f => !isSocialPlatform(f.label)).map((field, index) => (
                    <div key={index} className="flex text-sm">
                        <span className="font-semibold text-muted-foreground mr-2">{field.label}:</span>
                        <span className="text-secondary-foreground break-all">{field.value}</span>
                    </div>
                ))}
            </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-4">
        <div className="w-full flex justify-end items-center text-sm text-muted-foreground">
            <div className="flex items-center justify-end space-x-2">
                {approvedImages.length > 0 && (
                    <Button asChild variant="ghost" size="sm" className="flex items-center gap-1">
                        <NextLink href={`/post/${post.id}`}>
                            <Images className="h-4 w-4" />
                            <span>{approvedImages.length}</span>
                        </NextLink>
                    </Button>
                )}
                <CommentSheet postId={post.id}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentCount || 0}</span>
                    </Button>
                </CommentSheet>
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
