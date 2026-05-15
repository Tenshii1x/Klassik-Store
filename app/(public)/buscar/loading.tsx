import { ProductosGridSkeleton } from "@/components/public/LoadingSkeleton"

export default function Loading() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="h-12 w-48 mx-auto mb-10 bg-white/5 rounded animate-pulse" />
      <ProductosGridSkeleton count={8} />
    </section>
  )
}
