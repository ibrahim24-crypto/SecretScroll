'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          
          if (user.email === 'ibrahimezzine09@gmail.com') {
            const adminProfile = { ...profile, role: 'admin' as const, permissions: allPermissions };
            setUserProfile(adminProfile);
            // Ensure super admin permissions are always fully synced in Firestore
            if (JSON.stringify(profile.permissions) !== JSON.stringify(allPermissions) || profile.role !== 'admin') {
              setDoc(userRef, { role: 'admin', permissions: allPermissions }, { merge: true });
            }
          } else {
            // Ensure permissions object exists for all users
            const currentPermissions = profile.permissions || noPermissions;
            setUserProfile({ ...profile, permissions: currentPermissions });
            if (!profile.permissions) {
               setDoc(userRef, { permissions: currentPermissions }, { merge: true });
            }
          }
        } else {
          // Create new user profile
          const isSuperAdmin = user.email === 'ibrahimezzine09@gmail.com';
          const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: isSuperAdmin ? 'admin' : 'user',
            permissions: isSuperAdmin ? allPermissions : noPermissions,
            createdAt: serverTimestamp() as any,
          };
          
          const batch = writeBatch(db);
          batch.set(userRef, newUserProfile);

          // If it's an anonymous user, also create the display name lock file.
          if (user.email === null && user.displayName) {
              const displayNameRef = doc(db, 'userDisplayNames', user.displayName);
              batch.set(displayNameRef, { uid: user.uid });
          }

          batch.commit()
            .then(() => {
                // We can assume the profile is what we just set. No need to re-fetch.
                setUserProfile(newUserProfile);
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: newUserProfile,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
