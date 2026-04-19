
import { LiveMasonryGrid } from '@/components/live-masonry-grid';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LuxuryLoader } from '@/components/luxury-loader';
import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';

// Revalidate the live wall every 15 seconds at the edge so 100 concurrent
// guest refreshes hit Vercel's CDN cache instead of the database.
export const revalidate = 15;

async function getMediaItems() {
    // In production this becomes a single cached DB read per 15-second window.
    // const items = await db.select().from(mediaTable).orderBy(desc(mediaTable.createdAt));
    
    const mediaItems = PlaceHolderImages.filter(p => p.id.startsWith('gallery-') && Math.random() > 0.2).map((p, index) => ({
      ...p,
      id: p.id + '-' + index,
      guestName: ['Aunt Fatima', 'Cousin Mike', 'Sarah Smith', 'John Doe', 'Jane Doe', 'Uncle Bob'][index % 6],
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));
    return mediaItems;
}

function GridSkeleton() {
    return (
        <div className="space-y-10">
            {/* Pulsing R&A monogram — the "expensive" loading state */}
            <div className="flex flex-col items-center py-12">
                <LuxuryLoader label="Developing..." size="lg" />
            </div>
            {/* Ghost card grid below the monogram */}
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="break-inside-avoid-column space-y-2">
                        <Skeleton className={cn(
                            "w-full rounded-md bg-[#d4af37]/10",
                            i % 3 === 0 && 'h-48',
                            i % 3 === 1 && 'h-72',
                            i % 3 === 2 && 'h-60',
                        )} />
                        <Skeleton className="h-3 w-2/5 mx-auto bg-[#d4af37]/10" />
                    </div>
                ))}
            </div>
        </div>
    );
}

async function MediaGrid() {
    const mediaItems = await getMediaItems();

    if (mediaItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <Camera size={48} className="mb-4" />
                <h2 className="text-xl font-semibold">The Live Wall is Quiet...</h2>
                <p>Be the first to capture a memory!</p>
            </div>
        )
    }

    return <LiveMasonryGrid mediaItems={mediaItems} />;
}

export default function LiveWallPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-8">
                <h1 className="font-headline text-4xl md:text-5xl font-bold italic text-aurora-soft-gold/90">
                    Live Memory Wall
                </h1>
                <p className="text-muted-foreground tracking-wide mt-2">Memories from the union of Razia & Abduraziq</p>
            </header>
             <Suspense fallback={<GridSkeleton />}>
                <MediaGrid />
            </Suspense>
        </div>
    );
}
