'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { PostCard } from './PersonCard';
import { PersonCardSkeleton } from './PersonCardSkeleton';
import { useAuth } from '@/hooks/useAuth';

const BATCH_SIZE = 8;

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
      orderBy('createdAt', 'desc'), 
      limit(BATCH_SIZE)
    );

    if (lastDoc) {
      postQuery = query(
        collection(db, 'posts'), 
        where('status', '==', 'approved'), 
        orderBy('createdAt', 'desc'), 
        startAfter(lastDoc), 
        limit(BATCH_SIZE)
      );
    }

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
    setLoading(false);
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
    <div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {posts.map((post, index) => {
          if (posts.length === index + 1) {
            return <div ref={lastElementRef} key={post.id}><PostCard post={post} /></div>;
          }
          return <PostCard key={post.id} post={post} />;
        })}
      </div>
      {loading && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mt-8">
          {[...Array(3)].map((_, i) => <PersonCardSkeleton key={i} />)}
        </div>
      )}
      {!loading && !hasMore && posts.length > 0 && (
        <p className="text-center text-muted-foreground mt-8">You've reached the end of the scroll.</p>
      )}
       {!loading && posts.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">No posts yet. Be the first to create one!</p>
      )}
    </div>
  );
}
