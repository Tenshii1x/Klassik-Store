import { Skeleton } from "@/components/public/LoadingSkeleton"

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-8" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
