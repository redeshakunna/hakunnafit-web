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
          plan: "starter" | "pro" | "elite" | null;
          ciudad: string | null;
          subdominio_propuesto: string | null;
          especialidad: string | null;
          metodo_actual: string | null;
          pasarela_interes: string | null;
          tiene_dominio: string | null;
          tiene_logo: string | null;
          interes_tienda: string | null;
          fuente: string;
          landing_template: string | null;
          biografia: string | null;
          instagram: string | null;
          facebook: string | null;
          avatar_url: string | null;
          email_publico: string | null;
          onboarding_token: string | null;
          onboarding_token_expires_at: string | null;
          onboarding_token_used_at: string | null;
          revision_notas: string | null;
          pago_estado: string;
          pago_referencia: string | null;
          pago_wompi_transaction_id: string | null;
          pago_monto_cop: number | null;
          pago_ciclo: string | null;
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
          plan?: "starter" | "pro" | "elite" | null;
          ciudad?: string | null;
          subdominio_propuesto?: string | null;
          especialidad?: string | null;
          metodo_actual?: string | null;
          pasarela_interes?: string | null;
          tiene_dominio?: string | null;
          tiene_logo?: string | null;
          interes_tienda?: string | null;
          fuente?: string;
          landing_template?: string | null;
          biografia?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          avatar_url?: string | null;
          email_publico?: string | null;
          onboarding_token?: string | null;
          onboarding_token_expires_at?: string | null;
          onboarding_token_used_at?: string | null;
          revision_notas?: string | null;
          pago_estado?: string;
          pago_referencia?: string | null;
          pago_wompi_transaction_id?: string | null;
          pago_monto_cop?: number | null;
          pago_ciclo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hakunnafit_leads"]["Insert"]>;
        Relationships: [];
      };
      trainers: {
        Row: {
          id: string;
          business_name: string;
          whatsapp: string | null;
          whatsapp_publico: string | null;
          plan: "starter" | "pro" | "elite" | null;
          landing_status: "pendiente" | "en_diseno" | "en_revision" | "publicada" | "suspendida";
          dashboard_access: "sin_acceso" | "activo" | "suspendido" | "bloqueado";
          lead_id: string | null;
          proximo_cobro: string | null;
          ciudad: string | null;
          subdominio: string | null;
          created_at: string;
          pais: string | null;
          especialidad: string | null;
          instagram: string | null;
          facebook: string | null;
          biografia: string | null;
          avatar_url: string | null;
          notas_internas: string | null;
          dominio_propio: string | null;
          landing_template: string | null;
          mostrar_transformaciones: boolean;
          transformaciones: Json | null;
          updated_at: string;
          email_publico: string | null;
          foto2_url: string | null;
          foto3_url: string | null;
          foto4_url: string | null;
          servicios: Json | null;
          estadisticas: Json | null;
          testimonios: Json | null;
          tagline: string | null;
          onboarding_step: string | null;
          onboarding_completed_at: string | null;
          logo_url: string | null;
          color_primario: string;
          color_secundario: string;
          color_terciario: string;
          banner_url: string | null;
          secciones_activas: Json;
          preguntas_frecuentes: Json | null;
          landing_draft: Json | null;
          landing_draft_updated_at: string | null;
          landing_published_at: string | null;
          planes_ofrecidos: Json;
          contrato_inicio: string | null;
          datos_cobro: Json | null;
          modalidad: string | null;
          directorio_pausado_manual: boolean;
        };
        Insert: {
          id?: string;
          business_name?: string;
          whatsapp?: string | null;
          whatsapp_publico?: string | null;
          plan?: "starter" | "pro" | "elite" | null;
          landing_status?: "pendiente" | "en_diseno" | "en_revision" | "publicada" | "suspendida";
          dashboard_access?: "sin_acceso" | "activo" | "suspendido" | "bloqueado";
          lead_id?: string | null;
          proximo_cobro?: string | null;
          ciudad?: string | null;
          subdominio?: string | null;
          created_at?: string;
          pais?: string | null;
          especialidad?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          biografia?: string | null;
          avatar_url?: string | null;
          notas_internas?: string | null;
          dominio_propio?: string | null;
          landing_template?: string | null;
          mostrar_transformaciones?: boolean;
          transformaciones?: Json | null;
          updated_at?: string;
          email_publico?: string | null;
          foto2_url?: string | null;
          foto3_url?: string | null;
          foto4_url?: string | null;
          servicios?: Json | null;
          estadisticas?: Json | null;
          testimonios?: Json | null;
          tagline?: string | null;
          onboarding_step?: string | null;
          onboarding_completed_at?: string | null;
          logo_url?: string | null;
          color_primario?: string;
          color_secundario?: string;
          color_terciario?: string;
          banner_url?: string | null;
          secciones_activas?: Json;
          preguntas_frecuentes?: Json | null;
          landing_draft?: Json | null;
          landing_draft_updated_at?: string | null;
          landing_published_at?: string | null;
          planes_ofrecidos?: Json;
          contrato_inicio?: string | null;
          datos_cobro?: Json | null;
          modalidad?: string | null;
          directorio_pausado_manual?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["trainers"]["Insert"]>;
        Relationships: [];
      };
      trainer_directory_stats: {
        Row: {
          trainer_id: string;
          visible: boolean;
          is_new: boolean;
          new_status_expires_at: string | null;
          ranking_score: number;
          rating_average: number;
          rating_count: number;
          conversion_rate: number;
          cupos_disponibles: number;
          leads_received_count: number;
          leads_converted_count: number;
          grace_period_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          trainer_id: string;
          visible?: boolean;
          is_new?: boolean;
          new_status_expires_at?: string | null;
          ranking_score?: number;
          rating_average?: number;
          rating_count?: number;
          conversion_rate?: number;
          cupos_disponibles?: number;
          leads_received_count?: number;
          leads_converted_count?: number;
          grace_period_ends_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trainer_directory_stats"]["Insert"]>;
        Relationships: [];
      };
      directory_leads: {
        Row: {
          id: string;
          trainer_id: string;
          ref_code: string;
          lead_name: string;
          lead_email: string;
          consent_given: boolean;
          consent_given_at: string | null;
          clicked_at: string;
          contact_form_submitted_at: string | null;
          redirected_at: string | null;
          converted: boolean;
          converted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          ref_code?: string;
          lead_name: string;
          lead_email: string;
          consent_given?: boolean;
          consent_given_at?: string | null;
          clicked_at?: string;
          contact_form_submitted_at?: string | null;
          redirected_at?: string | null;
          converted?: boolean;
          converted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["directory_leads"]["Insert"]>;
        Relationships: [];
      };
      trainer_reviews: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          client_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trainer_reviews"]["Insert"]>;
        Relationships: [];
      };
      plan_settings: {
        Row: {
          plan: "starter" | "pro" | "elite";
          monthly_cop: number;
          semester_cop: number;
          annual_cop: number;
          updated_at: string;
        };
        Insert: {
          plan: "starter" | "pro" | "elite";
          monthly_cop: number;
          semester_cop: number;
          annual_cop: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_settings"]["Insert"]>;
        Relationships: [];
      };
      trainer_activity: {
        Row: {
          id: string;
          trainer_id: string;
          type: string;
          title: string;
          description: string | null;
          leida: boolean;
          created_at: string;
          link: string | null;
          dedupe_key: string | null;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          type: string;
          title: string;
          description?: string | null;
          leida?: boolean;
          created_at?: string;
          link?: string | null;
          dedupe_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["trainer_activity"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          trainer_id: string;
          user_id: string | null;
          full_name: string;
          email: string | null;
          whatsapp: string | null;
          sexo: string | null;
          objetivo: string | null;
          nivel: string | null;
          actividad: string | null;
          rutina_actual: string | null;
          peso_actual: number | null;
          altura: number | null;
          plan_elegido: string | null;
          dias_por_semana: number | null;
          horario_entreno: string | null;
          status: "pendiente_evaluacion" | "activo" | "pausado" | "inactivo";
          pausado_motivo: string | null;
          pausado_en: string | null;
          perfil_deportivo: Json | null;
          calendar_connect_token: string | null;
          calendar_connect_token_expires_at: string | null;
          sesiones_contratadas: number | null;
          portal_token: string;
          documento: string | null;
          avatar_url: string | null;
          access_code: string | null;
          access_code_expires_at: string | null;
          created_at: string;
          plan_precio_cop: number | null;
          fecha_inicio_facturacion: string | null;
          proximo_cobro_cliente: string | null;
          compromiso_meses_minimo: number;
          meses_pagados: number;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          user_id?: string | null;
          full_name: string;
          email?: string | null;
          whatsapp?: string | null;
          sexo?: string | null;
          objetivo?: string | null;
          nivel?: string | null;
          actividad?: string | null;
          rutina_actual?: string | null;
          peso_actual?: number | null;
          altura?: number | null;
          plan_elegido?: string | null;
          dias_por_semana?: number | null;
          horario_entreno?: string | null;
          status?: "pendiente_evaluacion" | "activo" | "pausado" | "inactivo";
          pausado_motivo?: string | null;
          pausado_en?: string | null;
          perfil_deportivo?: Json | null;
          calendar_connect_token?: string | null;
          calendar_connect_token_expires_at?: string | null;
          sesiones_contratadas?: number | null;
          portal_token?: string;
          documento?: string | null;
          avatar_url?: string | null;
          access_code?: string | null;
          plan_precio_cop?: number | null;
          fecha_inicio_facturacion?: string | null;
          proximo_cobro_cliente?: string | null;
          compromiso_meses_minimo?: number;
          meses_pagados?: number;
          access_code_expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      client_payments: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string;
          monto_cop: number;
          periodo_cubierto: string;
          pagado_en: string;
          created_at: string;
          comprobante_url: string | null;
          confirmado_por_entrenador: boolean;
        };
        Insert: {
          id?: string;
          client_id: string;
          trainer_id: string;
          monto_cop: number;
          periodo_cubierto: string;
          pagado_en?: string;
          created_at?: string;
          comprobante_url?: string | null;
          confirmado_por_entrenador?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["client_payments"]["Insert"]>;
        Relationships: [];
      };
      google_calendar_connections: {
        Row: {
          id: string;
          owner_type: "trainer" | "client";
          owner_id: string;
          google_email: string | null;
          access_token: string;
          refresh_token: string;
          access_token_expires_at: string;
          calendar_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_type: "trainer" | "client";
          owner_id: string;
          google_email?: string | null;
          access_token: string;
          refresh_token: string;
          access_token_expires_at: string;
          calendar_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["google_calendar_connections"]["Insert"]>;
        Relationships: [];
      };
      evaluation_calendar_events: {
        Row: {
          id: string;
          evaluation_id: string;
          connection_id: string;
          google_event_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          connection_id: string;
          google_event_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["evaluation_calendar_events"]["Insert"]>;
        Relationships: [];
      };
      training_logs: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string;
          fecha: string;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          trainer_id: string;
          fecha?: string;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_logs"]["Insert"]>;
        Relationships: [];
      };
      measurements: {
        Row: {
          id: string;
          client_id: string;
          fecha: string;
          peso: number | null;
          medidas: Json | null;
          foto_url: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          fecha?: string;
          peso?: number | null;
          medidas?: Json | null;
          foto_url?: string | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurements"]["Insert"]>;
        Relationships: [];
      };
      weekly_plans: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string;
          dias_por_semana: number;
          horario: string;
          resumen_frecuencia: string | null;
          nota_perfil: string | null;
          dias: Json;
          status: "pendiente" | "revisando" | "aprobado";
          nota_aprobacion: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          trainer_id: string;
          dias_por_semana: number;
          horario: string;
          resumen_frecuencia?: string | null;
          nota_perfil?: string | null;
          dias: Json;
          status?: "pendiente" | "revisando" | "aprobado";
          nota_aprobacion?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["weekly_plans"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
          category: string;
          description: string | null;
          image_url: string | null;
          source: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          muscle_group: string;
          equipment?: string;
          category?: string;
          description?: string | null;
          image_url?: string | null;
          source?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      alimentos: {
        Row: {
          id: string;
          nombre: string;
          categoria: string;
          tiendas: string[];
          unidad_referencia: string;
          calorias: number;
          proteina_g: number;
          carbohidratos_g: number;
          grasa_g: number;
          precio_cop: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          categoria: string;
          tiendas?: string[];
          unidad_referencia: string;
          calorias: number;
          proteina_g?: number;
          carbohidratos_g?: number;
          grasa_g?: number;
          precio_cop?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alimentos"]["Insert"]>;
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string;
          comidas_por_dia: number;
          objetivo: string | null;
          nota_perfil: string | null;
          dias: Json;
          status: "pendiente" | "revisando" | "aprobado";
          nota_aprobacion: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          trainer_id: string;
          comidas_por_dia?: number;
          objetivo?: string | null;
          nota_perfil?: string | null;
          dias?: Json;
          status?: "pendiente" | "revisando" | "aprobado";
          nota_aprobacion?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plans"]["Insert"]>;
        Relationships: [];
      };
      evaluations: {
        Row: {
          id: string;
          client_id: string;
          trainer_id: string;
          scheduled_at: string | null;
          status: string;
          modalidad: string;
          titulo: string | null;
          notas: string | null;
          duracion_min: number;
          meet_link: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          trainer_id: string;
          scheduled_at?: string | null;
          status?: string;
          modalidad?: string;
          titulo?: string | null;
          notas?: string | null;
          duracion_min?: number;
          meet_link?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["evaluations"]["Insert"]>;
        Relationships: [];
      };
      session_proposals: {
        Row: {
          id: string;
          trainer_id: string;
          client_id: string;
          status: "pendiente" | "completada" | "cancelada";
          token: string;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          client_id: string;
          status?: "pendiente" | "completada" | "cancelada";
          token: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_proposals"]["Insert"]>;
        Relationships: [];
      };
      session_proposal_items: {
        Row: {
          id: string;
          proposal_id: string;
          scheduled_at: string;
          duration_min: number;
          modalidad: string;
          status: "pendiente" | "aprobada" | "rechazada";
          evaluation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          scheduled_at: string;
          duration_min?: number;
          modalidad?: string;
          status?: "pendiente" | "aprobada" | "rechazada";
          evaluation_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_proposal_items"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: "trainer" | "client";
          full_name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "trainer" | "client";
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          type: "lead_nuevo" | "entrenador_aprobado" | "estado_cambio" | "cobro_por_vencer";
          title: string;
          message: string;
          link: string | null;
          trainer_id: string | null;
          lead_id: string | null;
          read: boolean;
          dedupe_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "lead_nuevo" | "entrenador_aprobado" | "estado_cambio" | "cobro_por_vencer";
          title: string;
          message: string;
          link?: string | null;
          trainer_id?: string | null;
          lead_id?: string | null;
          read?: boolean;
          dedupe_key?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: number;
          contact_email: string | null;
          contact_whatsapp: string | null;
          contact_whatsapp_display: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          tiktok_url: string | null;
          resend_from_address: string | null;
          admin_notification_email: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          contact_email?: string | null;
          contact_whatsapp?: string | null;
          contact_whatsapp_display?: string | null;
          instagram_url?: string | null;
          facebook_url?: string | null;
          tiktok_url?: string | null;
          resend_from_address?: string | null;
          admin_notification_email?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          flow_id: string;
          category: "corporate" | "trainer" | "client";
          to_email: string;
          subject: string;
          status: "sent" | "failed" | "skipped_config";
          is_test: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          flow_id: string;
          category: "corporate" | "trainer" | "client";
          to_email: string;
          subject: string;
          status: "sent" | "failed" | "skipped_config";
          is_test?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_log"]["Insert"]>;
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
