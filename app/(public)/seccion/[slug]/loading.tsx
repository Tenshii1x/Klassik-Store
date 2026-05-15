import { ProductosGridSkeleton, Skeleton } from "@/components/public/LoadingSkeleton"

export default function Loading() {
  return (
    <>
      <div className="bg-gradient-to-br from-black to-black-soft border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
          <Skeleton className="h-4 w-32 mx-auto mb-4" />
          <Skeleton className="h-14 w-64 mx-auto mb-5" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
      </div>
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <ProductosGridSkeleton count={8} />
      </section>
    </>
  )
}
