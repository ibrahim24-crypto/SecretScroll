import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PersonCardSkeleton({ isFullScreen = false }: { isFullScreen?: boolean }) {
  if (isFullScreen) {
    return (
      <div className="h-dvh w-screen snap-start bg-background flex flex-col justify-end p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-20" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-12" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="break-inside-avoid">
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-grow space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
         <Skeleton className="h-40 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Skeleton className="h-6 w-16" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </CardFooter>
    </Card>
  );
}
