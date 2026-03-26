'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AuthContext } from '@/hooks/useAuth';
import type { UserProfile, AdminPermissions, Permission } from '@/lib/types';
import { PERMISSIONS } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const allPermissions = Object.keys(PERMISSIONS).reduce((acc, key) => {
    acc[key as Permission] = true;
    return acc;
}, {} as AdminPermissions);

const noPermissions = Object.keys(PERMISSIONS).reduce((acc, key) => {
    acc[key as Permission] = false;
    return acc;
}, {} as AdminPermissions);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onIdTokenChanged(auth, async (authUser) => {
      // Clean up previous profile listener
      unsubscribeProfile();

      if (authUser) {
        setUser(authUser);
        const userRef = doc(db, 'users', authUser.uid);
        
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;

            // Sync displayName from Auth → Firestore if anonymous user's profile was created before updateProfile ran
            if (authUser.displayName && !profile.displayName) {
              setDoc(userRef, { displayName: authUser.displayName }, { merge: true }).catch(console.error);
            }
            const resolvedDisplayName = profile.displayName || authUser.displayName;
            
            if (authUser.email === 'ibrahimezzine09@gmail.com') {
              const superAdminProfile = { ...profile, role: 'admin' as const, permissions: allPermissions, displayName: resolvedDisplayName };
              if (JSON.stringify(profile.permissions) !== JSON.stringify(allPermissions) || profile.role !== 'admin') {
                setDoc(userRef, { role: 'admin', permissions: allPermissions }, { merge: true })
                  .then(() => setUserProfile(superAdminProfile))
                  .catch(console.error);
              } else {
                setUserProfile(superAdminProfile);
              }
            } else {
              const currentPermissions = profile.permissions || noPermissions;
              const currentRole = profile.role || 'user';
              const userProfileWithDefaults = { ...profile, role: currentRole, permissions: currentPermissions, displayName: resolvedDisplayName };
               if (!profile.permissions || !profile.role) {
                 setDoc(userRef, { role: currentRole, permissions: currentPermissions }, { merge: true })
                    .then(() => setUserProfile(userProfileWithDefaults))
                    .catch(console.error);
              } else {
                  setUserProfile(userProfileWithDefaults);
              }
            }
          } else {
            // Create new user profile if it doesn't exist
            const isSuperAdmin = authUser.email === 'ibrahimezzine09@gmail.com';
            const newUserProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              role: isSuperAdmin ? 'admin' : 'user',
              permissions: isSuperAdmin ? allPermissions : noPermissions,
              createdAt: serverTimestamp() as any,
            };
            
            const batch = writeBatch(db);
            batch.set(userRef, newUserProfile);

            if (authUser.email === null && authUser.displayName) {
                const displayNameRef = doc(db, 'userDisplayNames', authUser.displayName);
                batch.set(displayNameRef, { uid: authUser.uid });
            }

            batch.commit().catch((serverError) => {
                  const permissionError = new FirestorePermissionError({
                      path: userRef.path, operation: 'create', requestResourceData: newUserProfile,
                  });
                  errorEmitter.emit('permission-error', permissionError);
                  // Return to login if profile creation fails
                  signOut(auth);
              });
          }
          setLoading(false);
        }, (error: any) => {
            console.error("Error listening to user profile:", error);
            if (error.code === 'permission-denied') {
                signOut(auth);
            }
            setLoading(false);
        });

      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
