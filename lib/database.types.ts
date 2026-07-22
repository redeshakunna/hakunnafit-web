// Tipos mínimos — este proyecto solo lee/escribe la tabla hakunnafit_leads
// (vive en el mismo proyecto de Supabase que el producto de Marion, pero
// HakunnaFit no necesita conocer el resto del esquema multi-tenant).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      hakunnafit_leads: {
        Row: {
          id: string;
          nombre: string;
          negocio: string | null;
          email: string;
          whatsapp: string | null;
          num_clientes: string | null;
          necesidades: string[] | null;
          mensaje: string | null;
          estado: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          negocio?: string | null;
          email: string;
          whatsapp?: string | null;
          num_clientes?: string | null;
          necesidades?: string[] | null;
          mensaje?: string | null;
          estado?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hakunnafit_leads"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: "ropa" | "suplementos";
          description: string | null;
          price_cop: number;
          image_url: string | null;
          stock: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: "ropa" | "suplementos";
          description?: string | null;
          price_cop: number;
          image_url?: string | null;
          stock?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string | null;
          total_cop: number;
          status: "pendiente" | "aprobado" | "declinado" | "expirado";
          wompi_reference: string;
          wompi_transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_name: string;
          buyer_email: string;
          buyer_phone?: string | null;
          total_cop: number;
          status?: "pendiente" | "aprobado" | "declinado" | "expirado";
          wompi_reference: string;
          wompi_transaction_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cop: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cop: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
