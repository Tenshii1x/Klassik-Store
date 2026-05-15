import { Skeleton } from "@/components/public/LoadingSkeleton"

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-12 w-full mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
