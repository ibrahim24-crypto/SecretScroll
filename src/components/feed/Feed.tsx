'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Person, Secret } from '@/lib/types';
import { PersonCard } from './PersonCard';
import { PersonCardSkeleton } from './PersonCardSkeleton';
import { useAuth } from '@/hooks/useAuth';

const BATCH_SIZE = 5;

type PersonWithSecrets = Person & { secrets: Secret[] };

export function Feed() {
  const { user } = useAuth();
  const [people, setPeople] = useState<PersonWithSecrets[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const observer = useRef<IntersectionObserver>();

  const fetchPeopleAndSecrets = useCallback(async (lastDoc: QueryDocumentSnapshot<DocumentData> | null) => {
    setLoading(true);

    let personQuery = query(collection(db, 'persons'), orderBy('createdAt', 'desc'), limit(BATCH_SIZE));
    if (lastDoc) {
      personQuery = query(collection(db, 'persons'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(BATCH_SIZE));
    }

    const personDocs = await getDocs(personQuery);
    setHasMore(personDocs.docs.length === BATCH_SIZE);
    setLastVisible(personDocs.docs[personDocs.docs.length - 1]);

    const newPeople = await Promise.all(
      personDocs.docs.map(async (doc) => {
        const personData = { id: doc.id, ...doc.data() } as Person;
        
        const secretsQuery = query(
          collection(db, 'secrets'),
          where('personId', '==', personData.id),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const secretsSnapshot = await getDocs(secretsQuery);
        let secrets = secretsSnapshot.docs.map(s => ({ id: s.id, ...s.data() } as Secret));

        if (user) {
          const votePromises = secrets.map(async (secret) => {
            const voteRef = collection(db, 'votes');
            const voteQuery = query(voteRef, where('secretId', '==', secret.id), where('userId', '==', user.uid));
            const voteSnapshot = await getDocs(voteQuery);
            if (!voteSnapshot.empty) {
              return { ...secret, userVote: voteSnapshot.docs[0].data().type };
            }
            return secret;
          });
          secrets = await Promise.all(votePromises);
        }

        return { ...personData, secrets };
      })
    );
    
    setPeople(prev => [...prev, ...newPeople]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPeopleAndSecrets(null);
  }, [fetchPeopleAndSecrets]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPeopleAndSecrets(lastVisible);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, lastVisible, fetchPeopleAndSecrets]);


  return (
    <div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {people.map((p, index) => {
          if (people.length === index + 1) {
            return <div ref={lastElementRef} key={p.id}><PersonCard person={p} secrets={p.secrets} /></div>;
          }
          return <PersonCard key={p.id} person={p} secrets={p.secrets} />;
        })}
      </div>
      {loading && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mt-8">
          {[...Array(3)].map((_, i) => <PersonCardSkeleton key={i} />)}
        </div>
      )}
      {!loading && !hasMore && people.length > 0 && (
        <p className="text-center text-muted-foreground mt-8">You've reached the end of the scroll.</p>
      )}
       {!loading && people.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">No secrets yet. Be the first to add one!</p>
      )}
    </div>
  );
}
