import { Header } from "@/components/layout/Header";
import { ProfileFeed } from "@/components/profile/ProfileFeed";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}


export default async function ProfilePage({ params }: { params: { userId: string } }) {
    const userProfile = await getUserProfile(params.userId);

    if (!userProfile) {
        return (
            <>
                <Header />
                <main className="container py-8 text-center">
                    <h1 className="text-2xl font-bold">User not found</h1>
                    <p className="text-muted-foreground">The profile you are looking for does not exist.</p>
                </main>
            </>
        )
    }

    return (
        <>
            <Header />
            <main className="container py-8">
                <div className="flex flex-col items-center md:flex-row md:items-start gap-8 mb-8">
                    <Avatar className="h-32 w-32 border-4 border-primary">
                        <AvatarImage src={userProfile.photoURL || ''} alt={userProfile.displayName || 'User'} />
                        <AvatarFallback className="text-4xl">
                            {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <User />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left pt-4">
                        <h1 className="text-4xl font-bold tracking-tight font-headline">{userProfile.displayName}</h1>
                        <p className="text-muted-foreground">{userProfile.email}</p>
                        <p className="text-sm text-muted-foreground mt-2">Member since {userProfile.createdAt.toDate().toLocaleDateString()}</p>
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight font-headline border-b pb-2 mb-4">Submitted Secrets</h2>
                <ProfileFeed userId={params.userId} />
            </main>
        </>
    );
}
