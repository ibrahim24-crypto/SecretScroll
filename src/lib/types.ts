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
  authorDisplayName?: string;
  authorPhotoURL?: string | null;
  title: string;
  content: string;
  imageUrls?: string[] | null;
  category: 'funny' | 'deep' | 'random' | 'advice';
  visibility: 'public';
  upvotes: number;
  downvotes: number;
  reports: number;
  status: 'approved';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userVote?: 'upvote' | 'downvote' | null;
  eventDate?: Timestamp;
  customFields?: { label: string; value: string }[];
  commentCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string; // 'anonymous' or user.uid
  authorDisplayName: string; // 'Anonymous' or user.displayName
  content: string;
  createdAt: Timestamp;
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
