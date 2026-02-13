import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  permissions?: AdminPermissions;
}

export const PERMISSIONS = {
  approve_pictures: 'Approve or reject user-submitted pictures.',
  delete_posts: 'Delete any post from the feed.',
  manage_forbidden_words: 'Add, remove, or edit forbidden words.',
  manage_admins: 'Grant or revoke admin privileges and their permissions.',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type AdminPermissions = {
  [key in Permission]?: boolean;
};

export interface PostImage {
  url: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Post {
  id: string;
  authorUid: string;
  title: string;
  content: string;
  images?: PostImage[] | null;
  hasPendingImages?: boolean;
  isFlagged: boolean;
  category: 'funny' | 'deep' | 'random' | 'advice';
  visibility: 'public';
  upvotes: number;
  downvotes: number;
  reports: number;
  status: 'approved'; // This status is now for the post text itself, which is always approved.
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

export interface AppSettings {
    id?: string;
    forbiddenWords: string[];
}
