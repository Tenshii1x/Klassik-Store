import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { Banner } from "@/components/public/Banner"
import { CartProvider } from "@/components/cart/CartProvider"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { WishlistProvider } from "@/components/wishlist/WishlistProvider"
import { FloatingWhatsApp } from "@/components/public/FloatingWhatsApp"
import { Toaster } from "@/components/admin/Toast"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <Banner />
        <Header />
        <main className="min-h-[calc(100vh-80px)]">{children}</main>
        <Footer />
        <FloatingWhatsApp />
        <CartDrawer />
        <Toaster />
      </WishlistProvider>
    </CartProvider>
  )
}
