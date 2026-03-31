'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ImageModal } from '@/components/ImageModal';


export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (params.id) {
      const fetchPost = async () => {
        setLoading(true);
        const postRef = doc(db, 'posts', params.id);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          setPost({ id: postSnap.id, ...postSnap.data() } as Post);
        } else {
          console.error("No such document!");
        }
        setLoading(false);
      };

      fetchPost();
    }
  }, [params.id]);

  const approvedImages = post?.images?.filter(img => img.status === 'approved').map(img => img.url) || [];

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % approvedImages.length);
  };

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + approvedImages.length) % approvedImages.length);
  };

  if (loading) {
    return (
        <div className="container py-8 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }
  
  if (!post) {
    return (
         <div className="container py-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Post not found</h1>
            <Button asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Feed
                </Link>
            </Button>
        </div>
    )
  }


  return (
    <main className="container py-8 max-w-4xl mx-auto">
       <Button asChild variant="ghost" className="mb-4">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Feed
            </Link>
        </Button>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-headline">{post.title}</CardTitle>
                <CardDescription>
                    Posted on {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : ''}
                    {post.eventDate && ` • Event on ${format(post.eventDate.toDate(), 'PPP')}`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-secondary-foreground leading-relaxed mb-6">{post.content}</p>

                 {approvedImages.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-4 border-t pt-4">Gallery</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {approvedImages.map((url, index) => (
                                <div 
                                  key={index} 
                                  className="relative aspect-square group cursor-pointer"
                                  onClick={() => handleImageClick(index)}
                                >
                                    <Image
                                        src={url}
                                        alt={`${post.title} image ${index + 1}`}
                                        fill
                                        className="rounded-md object-cover group-hover:opacity-90 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md flex items-center justify-center">
                                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">Click to view</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4 border-t">This post has no approved images.</p>
                )}

                <ImageModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  images={approvedImages}
                  currentIndex={selectedImageIndex}
                  onPrevious={handlePreviousImage}
                  onNext={handleNextImage}
                />
            </CardContent>
        </Card>

    </main>
  );
}
