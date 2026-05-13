import { CartDrawerClient } from "./CartDrawer.client"
import { getConfiguracion } from "@/lib/catalog/queries"

export async function CartDrawer() {
  const config = await getConfiguracion()
  return (
    <CartDrawerClient
      whatsappNumber={config?.whatsapp ?? null}
      storeName={config?.nombre_tienda ?? "Klassik Store"}
    />
  )
}
