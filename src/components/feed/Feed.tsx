'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot, onSnapshot } from 'firebase/firestore';
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
import { useLocale } from '@/hooks/useLocale';

const BATCH_SIZE = 5; // Smaller batch for mobile-first full-screen view

// A special component for the first "reel" on mobile
function WelcomeReel() {
    const { user } = useAuth();
    const { t } = useLocale();
    return (
        <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8 relative">
            <div className="absolute top-0 left-0 right-0">
                <Header/>
            </div>
            <h1 className="text-4xl font-headline font-bold mb-4">{t('feed.welcomeTitle')}</h1>
            <p className="text-xl text-muted-foreground mb-8">{t('feed.welcomeSubtitle')}</p>
            <ArrowDown className="h-12 w-12 animate-bounce text-primary" />
             {!user && (
                <div className="absolute bottom-24">
                     <p className="mb-4">{t('feed.getStartedPrompt')}</p>
                     <Button asChild>
                        <Link href="/add-person">{t('feed.getStartedButton')}</Link>
                     </Button>
                </div>
            )}
        </div>
    )
}

export function Feed() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const observer = useRef<IntersectionObserver>();

  const processAndSetUserVotes = useCallback(async (postsToProcess: Post[]): Promise<Post[]> => {
    if (!user) return postsToProcess;

    const votePromises = postsToProcess.map(async (post) => {
      if (post.userVote !== undefined) return post; // Already processed
      const voteRef = collection(db, 'votes');
      const voteQuery = query(voteRef, where('postId', '==', post.id), where('userId', '==', user.uid));
      const voteSnapshot = await getDocs(voteQuery);
      if (!voteSnapshot.empty) {
        return { ...post, userVote: voteSnapshot.docs[0].data().type };
      }
      return { ...post, userVote: null }; // Explicitly set to null if no vote
    });
    return Promise.all(votePromises);
  }, [user]);

  // Real-time listener for the initial posts
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(BATCH_SIZE)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const processedPosts = await processAndSetUserVotes(newPosts);

      setPosts(processedPosts);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(newLastVisible || null);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching real-time posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [processAndSetUserVotes]);
  
  const fetchMorePosts = useCallback(async () => {
    if (!hasMore || loadingMore || !lastVisible) return;
    setLoadingMore(true);

    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(BATCH_SIZE)
    );

    try {
      const documentSnapshots = await getDocs(q);
      const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      const processedPosts = await processAndSetUserVotes(newPosts);

      setHasMore(documentSnapshots.docs.length === BATCH_SIZE);
      const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(newLastVisible || null);
      
      setPosts(prevPosts => [...prevPosts, ...processedPosts]);
    } catch (error) {
      console.error("Error fetching more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastVisible, processAndSetUserVotes]);


  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMorePosts();
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, fetchMorePosts]);


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
             {(loading || loadingMore) && (
                [...Array(2)].map((_, i) => <PersonCardSkeleton key={`skeleton-mobile-${i}`} isFullScreen={true} />)
            )}
             {!loading && posts.length === 0 && (
                 <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8">
                     <h2 className="text-2xl font-bold font-headline">{t('feed.noPostsTitle')}</h2>
                     <p className="text-muted-foreground mb-4">{t('feed.noPostsSubtitle')}</p>
                      {user ? (
                        <Button asChild>
                            <Link href="/add-person">{t('feed.createFirstPost')}</Link>
                        </Button>
                     ) : (
                        <LoginButton />
                     )}
                 </div>
            )}
             {!loading && !hasMore && posts.length > 0 && (
                 <div className="h-dvh w-screen snap-start flex flex-col items-center justify-center text-center bg-background text-foreground p-8">
                     <h2 className="text-2xl font-bold font-headline">{t('feed.endOfFeedTitle')}</h2>
                     <p className="text-muted-foreground">{t('feed.endOfFeedSubtitle')}</p>
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
            {(loading || loadingMore) && (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mt-8">
                {[...Array(3)].map((_, i) => <PersonCardSkeleton key={`skeleton-desktop-${i}`} />)}
                </div>
            )}
            {!loading && !hasMore && posts.length > 0 && (
                <p className="text-center text-muted-foreground mt-8">{t('feed.endOfFeedTitle')}</p>
            )}
            {!loading && posts.length === 0 && (
                <p className="text-center text-muted-foreground mt-8">{t('feed.noPostsTitle')}</p>
            )}
        </div>
    </>
  );
}
