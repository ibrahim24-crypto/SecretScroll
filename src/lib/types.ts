import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  createdAt: Timestamp;
}

export interface Person {
  id: string;
  name: string;
  description?: string;
  photoUrls?: string[];
  category: 'celebrity' | 'politician' | 'public_figure' | 'other';
  verified: boolean;
  createdAt: Timestamp;
  createdBy: string;
  wearsGlasses?: boolean;
  gender?: 'male' | 'female' | 'other';
  birthday?: Timestamp;
  firstKiss?: string;
  schools?: string[];
  friends?: string[];
  externalLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
    google?: string;
    facebook?: string;
  };
}

export interface Secret {
  id: string;
  personId: string;
  userId: string;
  content: string;
  upvotes: number;
  downvotes: number;
  reports: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
  userVote?: 'upvote' | 'downvote' | null;
}

export interface Vote {
  id: string;
  secretId: string;
  userId: string;
  type: 'upvote' | 'downvote';
  createdAt: Timestamp;
}

export interface Report {
  id: string;
  secretId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
}
