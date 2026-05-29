import { NextRequest, NextResponse } from "next/server"
import { getProductosByIds } from "@/lib/catalog/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids : []
  const productos = await getProductosByIds(ids)
  return NextResponse.json(productos)
}
