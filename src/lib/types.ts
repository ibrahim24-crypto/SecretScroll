import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  bio?: string;
  externalLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
    github?: string;
  };
}

export interface Post {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  title: string;
  content: string;
  imageUrl?: string | null;
  category: 'funny' | 'deep' | 'random' | 'advice';
  visibility: 'public' | 'friends-only' | 'private';
  upvotes: number;
  downvotes: number;
  reports: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userVote?: 'upvote' | 'downvote' | null;
}

export interface Vote {
  id: string;
  postId: string;
  userId: string;
  type: 'upvote' | 'downvote';
  createdAt: Timestamp;
}

export interface Report {
  id:string;
  postId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
}
