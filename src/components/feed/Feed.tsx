'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { PostCard } from './PersonCard';
import { PersonCardSkeleton } from './PersonCardSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../ui/button';
import { ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { Header } from '../layout/Header';
import { LoginButton } from '../auth/LoginButton';

const BATCH_SIZE = 5; // Smaller batch for mobile-first full-screen view

// A special component for the first "reel" on mobile
function WelcomeReel() {
    const { user } = useAuth();
    return (
        <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8 relative">
            <div className="absolute top-0 left-0 right-0">
                <Header/>
            </div>
            <h1 className="text-4xl font-headline font-bold mb-4">Welcome to SecretReels</h1>
            <p className="text-xl text-muted-foreground mb-8">Swipe up to start exploring.</p>
            <ArrowDown className="h-12 w-12 animate-bounce text-primary" />
             {!user && (
                <div className="absolute bottom-24">
                     <p className="mb-4">Or create an account to share your own story.</p>
                     <Button asChild>
                        <Link href="/add-person">Get Started</Link>
                     </Button>
                </div>
            )}
        </div>
    )
}

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const observer = useRef<IntersectionObserver>();

  const fetchPosts = useCallback(async (lastDoc: QueryDocumentSnapshot<DocumentData> | null) => {
    setLoading(true);

    let postQuery = query(
      collection(db, 'posts'), 
      where('status', '==', 'approved'),
      where('visibility', '==', 'public'), // Only show public posts on main feed
      orderBy('createdAt', 'desc'), 
      limit(BATCH_SIZE)
    );

    if (lastDoc) {
      postQuery = query(
        collection(db, 'posts'), 
        where('status', '==', 'approved'), 
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'), 
        startAfter(lastDoc), 
        limit(BATCH_SIZE)
      );
    }

    try {
        const postDocs = await getDocs(postQuery);
        setHasMore(postDocs.docs.length === BATCH_SIZE);
        
        const newLastVisible = postDocs.docs[postDocs.docs.length - 1];
        if (newLastVisible) {
        setLastVisible(newLastVisible);
        }

        let newPosts = postDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

        if (user) {
        const votePromises = newPosts.map(async (post) => {
            const voteRef = collection(db, 'votes');
            // Note: The collection name for votes is 'votes', and postId should be used
            const voteQuery = query(voteRef, where('postId', '==', post.id), where('userId', '==', user.uid));
            const voteSnapshot = await getDocs(voteQuery);
            if (!voteSnapshot.empty) {
            return { ...post, userVote: voteSnapshot.docs[0].data().type };
            }
            return post;
        });
        newPosts = await Promise.all(votePromises);
        }
        
        setPosts(prev => lastDoc ? [...prev, ...newPosts] : newPosts);
    } catch (error) {
        console.error("Error fetching posts:", error);
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts(null);
  }, [fetchPosts]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(lastVisible);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, lastVisible, fetchPosts]);


  return (
    <>
        {/* Mobile: Reels-style full-screen scroll */}
        <div className="md:hidden h-dvh w-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
            <WelcomeReel />
            {posts.map((post, index) => {
                const isLastElement = posts.length === index + 1;
                return (
                    <div ref={isLastElement ? lastElementRef : null} key={post.id}>
                        <PostCard post={post} />
                    </div>
                );
            })}
             {loading && (
                [...Array(2)].map((_, i) => <PersonCardSkeleton key={`skeleton-mobile-${i}`} isFullScreen={true} />)
            )}
             {!loading && posts.length === 0 && (
                 <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8">
                     <h2 className="text-2xl font-bold font-headline">Nothing to see here yet.</h2>
                     <p className="text-muted-foreground mb-4">Once posts are approved by an admin, they will appear here.</p>
                      {user ? (
                        <Button asChild>
                            <Link href="/add-person">Create the first post</Link>
                        </Button>
                     ) : (
                        <LoginButton />
                     )}
                 </div>
            )}
             {!loading && !hasMore && posts.length > 0 && (
                 <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8">
                     <h2 className="text-2xl font-bold font-headline">You've reached the end</h2>
                     <p className="text-muted-foreground">Check back later for new posts!</p>
                 </div>
            )}
        </div>

        {/* Desktop: Masonry-style column layout */}
        <div className="hidden md:block">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                {posts.map((post, index) => {
                  const isLastElement = posts.length === index + 1;
                  return (
                    <div ref={isLastElement ? lastElementRef : null} key={post.id} className="break-inside-avoid">
                      <PostCard post={post} />
                    </div>
                  );
                })}
            </div>
            {loading && (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mt-8">
                {[...Array(3)].map((_, i) => <PersonCardSkeleton key={`skeleton-desktop-${i}`} />)}
                </div>
            )}
            {!loading && !hasMore && posts.length > 0 && (
                <p className="text-center text-muted-foreground mt-8">You've reached the end of the scroll.</p>
            )}
            {!loading && posts.length === 0 && (
                <p className="text-center text-muted-foreground mt-8">No posts yet. Be the first to create one!</p>
            )}
        </div>
    </>
  );
}
