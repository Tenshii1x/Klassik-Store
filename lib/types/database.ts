// Klassik Store · Database types
// Generated to match the schema in supabase/migrations/20260512000000_schema.sql
// To regenerate from a live database, use the Supabase CLI:
//   npx supabase gen types typescript --project-id ackefqrcejicepksrwiz > lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      secciones: {
        Row: {
          id: string
          nombre: string
          slug: string
          imagen_portada: string | null
          descripcion_corta: string | null
          orden: number
          tono: string
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          imagen_portada?: string | null
          descripcion_corta?: string | null
          orden?: number
          tono?: string
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          imagen_portada?: string | null
          descripcion_corta?: string | null
          orden?: number
          tono?: string
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subsecciones: {
        Row: {
          id: string
          seccion_id: string
          nombre: string
          slug: string
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          seccion_id: string
          nombre: string
          slug: string
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          seccion_id?: string
          nombre?: string
          slug?: string
          orden?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsecciones_seccion_id_fkey"
            columns: ["seccion_id"]
            referencedRelation: "secciones"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      etiquetas: {
        Row: {
          id: string
          nombre: string
          slug: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          id: string
          seccion_id: string | null
          subseccion_id: string | null
          nombre: string
          nombre_temu: string | null
          descripcion: string | null
          slug: string
          modelo: string | null
          modo: string
          stock_unidades: number | null
          costo_temu: number
          costo_envio_unitario: number
          precio_venta: number
          precio_anterior: number | null
          margen_override_porcentaje: number | null
          temu_url: string | null
          temu_goods_id: string | null
          notas_internas: string | null
          estado: string
          destacado: boolean
          etiquetas: string[]
          fecha_llegada_inicio: string | null
          fecha_llegada_fin: string | null
          solo_para_ella: boolean
          solo_para_el: boolean
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          seccion_id?: string | null
          subseccion_id?: string | null
          nombre: string
          nombre_temu?: string | null
          descripcion?: string | null
          slug: string
          modelo?: string | null
          modo?: string
          stock_unidades?: number | null
          costo_temu?: number
          costo_envio_unitario?: number
          precio_venta?: number
          precio_anterior?: number | null
          margen_override_porcentaje?: number | null
          temu_url?: string | null
          temu_goods_id?: string | null
          notas_internas?: string | null
          estado?: string
          destacado?: boolean
          etiquetas?: string[]
          fecha_llegada_inicio?: string | null
          fecha_llegada_fin?: string | null
          solo_para_ella?: boolean
          solo_para_el?: boolean
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          seccion_id?: string | null
          subseccion_id?: string | null
          nombre?: string
          nombre_temu?: string | null
          descripcion?: string | null
          slug?: string
          modelo?: string | null
          modo?: string
          stock_unidades?: number | null
          costo_temu?: number
          costo_envio_unitario?: number
          precio_venta?: number
          precio_anterior?: number | null
          margen_override_porcentaje?: number | null
          temu_url?: string | null
          temu_goods_id?: string | null
          notas_internas?: string | null
          estado?: string
          destacado?: boolean
          etiquetas?: string[]
          fecha_llegada_inicio?: string | null
          fecha_llegada_fin?: string | null
          solo_para_ella?: boolean
          solo_para_el?: boolean
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_seccion_id_fkey"
            columns: ["seccion_id"]
            referencedRelation: "secciones"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "productos_subseccion_id_fkey"
            columns: ["subseccion_id"]
            referencedRelation: "subsecciones"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      producto_imagenes: {
        Row: {
          id: string
          producto_id: string
          url: string
          orden: number
          tipo: string
          watermark_limpio: boolean
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          url: string
          orden?: number
          tipo?: string
          watermark_limpio?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          url?: string
          orden?: number
          tipo?: string
          watermark_limpio?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      producto_variantes: {
        Row: {
          id: string
          producto_id: string
          tipo: string
          valor: string
          precio_extra: number
          stock_unidades: number | null
          imagen_url: string | null
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          tipo: string
          valor: string
          precio_extra?: number
          stock_unidades?: number | null
          imagen_url?: string | null
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          tipo?: string
          valor?: string
          precio_extra?: number
          stock_unidades?: number | null
          imagen_url?: string | null
          orden?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_variantes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      productos_relacionados: {
        Row: {
          producto_id: string
          relacionado_id: string
          orden: number
        }
        Insert: {
          producto_id: string
          relacionado_id: string
          orden?: number
        }
        Update: {
          producto_id?: string
          relacionado_id?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_relacionados_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "productos_relacionados_relacionado_id_fkey"
            columns: ["relacionado_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      combos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio_combo: number
          imagen_url: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio_combo: number
          imagen_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio_combo?: number
          imagen_url?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      combo_productos: {
        Row: {
          combo_id: string
          producto_id: string
          cantidad: number
        }
        Insert: {
          combo_id: string
          producto_id: string
          cantidad?: number
        }
        Update: {
          combo_id?: string
          producto_id?: string
          cantidad?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_productos_combo_id_fkey"
            columns: ["combo_id"]
            referencedRelation: "combos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "combo_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      configuracion: {
        Row: {
          id: number
          nombre_tienda: string
          logo_url: string | null
          whatsapp: string | null
          instagram_handle: string | null
          instagram_url: string | null
          yappy_numero: string | null
          yappy_qr_url: string | null
          banco_nombre: string | null
          banco_cuenta: string | null
          banco_titular: string | null
          banco_tipo: string | null
          margen_global_porcentaje: number
          proxima_fecha_llegada_inicio: string | null
          proxima_fecha_llegada_fin: string | null
          banner_activo: boolean
          banner_texto: string | null
          banner_cta_texto: string | null
          banner_cta_url: string | null
          banner_color: string | null
          politica_devoluciones: string | null
          politica_privacidad: string | null
          terminos_condiciones: string | null
          mensaje_preorden: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          nombre_tienda?: string
          logo_url?: string | null
          whatsapp?: string | null
          instagram_handle?: string | null
          instagram_url?: string | null
          yappy_numero?: string | null
          yappy_qr_url?: string | null
          banco_nombre?: string | null
          banco_cuenta?: string | null
          banco_titular?: string | null
          banco_tipo?: string | null
          margen_global_porcentaje?: number
          proxima_fecha_llegada_inicio?: string | null
          proxima_fecha_llegada_fin?: string | null
          banner_activo?: boolean
          banner_texto?: string | null
          banner_cta_texto?: string | null
          banner_cta_url?: string | null
          banner_color?: string | null
          politica_devoluciones?: string | null
          politica_privacidad?: string | null
          terminos_condiciones?: string | null
          mensaje_preorden?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          nombre_tienda?: string
          logo_url?: string | null
          whatsapp?: string | null
          instagram_handle?: string | null
          instagram_url?: string | null
          yappy_numero?: string | null
          yappy_qr_url?: string | null
          banco_nombre?: string | null
          banco_cuenta?: string | null
          banco_titular?: string | null
          banco_tipo?: string | null
          margen_global_porcentaje?: number
          proxima_fecha_llegada_inicio?: string | null
          proxima_fecha_llegada_fin?: string | null
          banner_activo?: boolean
          banner_texto?: string | null
          banner_cta_texto?: string | null
          banner_cta_url?: string | null
          banner_color?: string | null
          politica_devoluciones?: string | null
          politica_privacidad?: string | null
          terminos_condiciones?: string | null
          mensaje_preorden?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          id: string
          codigo_publico: string
          nombre_cliente: string
          whatsapp_cliente: string | null
          email_cliente: string | null
          zona_entrega: string | null
          direccion_entrega: string | null
          metodo_pago: string | null
          comprobante_url: string | null
          monto_pagado_inicial: number | null
          comprobante_inicial_url: string | null
          monto_pagado_final: number | null
          comprobante_final_url: string | null
          total: number
          notas_internas: string | null
          estado_interno: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo_publico: string
          nombre_cliente: string
          whatsapp_cliente?: string | null
          email_cliente?: string | null
          zona_entrega?: string | null
          direccion_entrega?: string | null
          metodo_pago?: string | null
          comprobante_url?: string | null
          monto_pagado_inicial?: number | null
          comprobante_inicial_url?: string | null
          monto_pagado_final?: number | null
          comprobante_final_url?: string | null
          total?: number
          notas_internas?: string | null
          estado_interno?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo_publico?: string
          nombre_cliente?: string
          whatsapp_cliente?: string | null
          email_cliente?: string | null
          zona_entrega?: string | null
          direccion_entrega?: string | null
          metodo_pago?: string | null
          comprobante_url?: string | null
          monto_pagado_inicial?: number | null
          comprobante_inicial_url?: string | null
          monto_pagado_final?: number | null
          comprobante_final_url?: string | null
          total?: number
          notas_internas?: string | null
          estado_interno?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedido_items: {
        Row: {
          id: string
          pedido_id: string
          producto_id: string | null
          variante_id: string | null
          nombre_snapshot: string
          precio_snapshot: number
          cantidad: number
          modo: string
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          producto_id?: string | null
          variante_id?: string | null
          nombre_snapshot: string
          precio_snapshot: number
          cantidad?: number
          modo: string
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string
          producto_id?: string | null
          variante_id?: string | null
          nombre_snapshot?: string
          precio_snapshot?: number
          cantidad?: number
          modo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "pedido_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      waitlist: {
        Row: {
          id: string
          producto_id: string
          variante_id: string | null
          email: string
          creado_en: string
          notificado_en: string | null
        }
        Insert: {
          id?: string
          producto_id: string
          variante_id?: string | null
          email: string
          creado_en?: string
          notificado_en?: string | null
        }
        Update: {
          id?: string
          producto_id?: string
          variante_id?: string | null
          email?: string
          creado_en?: string
          notificado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "waitlist_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
      suscriptores_newsletter: {
        Row: {
          id: string
          email: string
          cupon_bienvenida_usado: boolean
          creado_en: string
        }
        Insert: {
          id?: string
          email: string
          cupon_bienvenida_usado?: boolean
          creado_en?: string
        }
        Update: {
          id?: string
          email?: string
          cupon_bienvenida_usado?: boolean
          creado_en?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          nombre: string | null
          rol: string
          created_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          rol?: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string | null
          rol?: string
          created_at?: string
        }
        Relationships: []
      }
      extension_api_keys: {
        Row: {
          id: string
          nombre: string
          key_hash: string
          key_prefix: string
          created_by: string | null
          created_at: string
          last_used_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          nombre: string
          key_hash: string
          key_prefix: string
          created_by?: string | null
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          key_hash?: string
          key_prefix?: string
          created_by?: string | null
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      importaciones_log: {
        Row: {
          id: string
          producto_id: string | null
          temu_url: string | null
          temu_goods_id: string | null
          api_key_id: string | null
          status: string
          error_message: string | null
          imagenes_count: number
          imagenes_failed: number
          created_at: string
        }
        Insert: {
          id?: string
          producto_id?: string | null
          temu_url?: string | null
          temu_goods_id?: string | null
          api_key_id?: string | null
          status: string
          error_message?: string | null
          imagenes_count?: number
          imagenes_failed?: number
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string | null
          temu_url?: string | null
          temu_goods_id?: string | null
          api_key_id?: string | null
          status?: string
          error_message?: string | null
          imagenes_count?: number
          imagenes_failed?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_log_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "importaciones_log_api_key_id_fkey"
            columns: ["api_key_id"]
            referencedRelation: "extension_api_keys"
            referencedColumns: ["id"]
            isOneToOne: false
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for convenience
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
