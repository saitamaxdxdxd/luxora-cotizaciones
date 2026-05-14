export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abonos: {
        Row: {
          case_id: string
          created_at: string
          fecha: string
          forma_pago: string
          id: string
          monto: number
          notas: string
          owner_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          fecha?: string
          forma_pago?: string
          id?: string
          monto?: number
          notas?: string
          owner_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          fecha?: string
          forma_pago?: string
          id?: string
          monto?: number
          notas?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rental_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_participants: {
        Row: {
          case_id: string
          created_at: string
          id: string
          invite_sent_at: string | null
          invite_token: string
          kyc_complete: boolean
          luxora_user_id: string | null
          organization_id: string | null
          owner_id: string
          progress: number
          representative_user_id: string | null
          risk_level: string
          risk_score: number
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          invite_sent_at?: string | null
          invite_token: string
          kyc_complete?: boolean
          luxora_user_id?: string | null
          organization_id?: string | null
          owner_id: string
          progress?: number
          representative_user_id?: string | null
          risk_level?: string
          risk_score?: number
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          invite_sent_at?: string | null
          invite_token?: string
          kyc_complete?: boolean
          luxora_user_id?: string | null
          organization_id?: string | null
          owner_id?: string
          progress?: number
          representative_user_id?: string | null
          risk_level?: string
          risk_score?: number
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rental_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_luxora_user_id_fkey"
            columns: ["luxora_user_id"]
            isOneToOne: false
            referencedRelation: "luxora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_representative_user_id_fkey"
            columns: ["representative_user_id"]
            isOneToOne: false
            referencedRelation: "luxora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      case_signatures: {
        Row: {
          case_id: string
          created_at: string
          firma_url: string | null
          id: string
          ip: string
          luxora_user_id: string | null
          otp_validado: boolean
          owner_id: string
          role: string
          signature_match_score: number
          signed_at: string
          user_agent: string
        }
        Insert: {
          case_id: string
          created_at?: string
          firma_url?: string | null
          id?: string
          ip?: string
          luxora_user_id?: string | null
          otp_validado?: boolean
          owner_id: string
          role: string
          signature_match_score?: number
          signed_at?: string
          user_agent?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          firma_url?: string | null
          id?: string
          ip?: string
          luxora_user_id?: string | null
          otp_validado?: boolean
          owner_id?: string
          role?: string
          signature_match_score?: number
          signed_at?: string
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_signatures_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rental_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_signatures_luxora_user_id_fkey"
            columns: ["luxora_user_id"]
            isOneToOne: false
            referencedRelation: "luxora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          luxora_user_id: string
          organization_id: string
          owner_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          luxora_user_id: string
          organization_id: string
          owner_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          luxora_user_id?: string
          organization_id?: string
          owner_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_luxora_user_id_fkey"
            columns: ["luxora_user_id"]
            isOneToOne: false
            referencedRelation: "luxora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      luxora_users: {
        Row: {
          accepted_terms_at: string | null
          actividad_economica: string
          addr_calle: string
          addr_ciudad: string
          addr_colonia: string
          addr_cp: string
          addr_estado: string
          addr_numero: string
          addr_verified: boolean
          apellido_materno: string
          apellido_paterno: string
          avg_score: number
          created_at: string
          curp: string
          email: string
          email_verified: boolean
          face_match_score: number
          fecha_nacimiento: string | null
          id: string
          incidents: number
          kyc_complete: boolean
          kyc_step: number
          liveness_ok: boolean
          nombre: string
          owner_id: string
          rfc: string
          risk_factors: string[]
          risk_level: string
          risk_score: number
          selfie_url: string | null
          telefono: string
          total_rentals: number
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          actividad_economica?: string
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          addr_numero?: string
          addr_verified?: boolean
          apellido_materno?: string
          apellido_paterno?: string
          avg_score?: number
          created_at?: string
          curp?: string
          email?: string
          email_verified?: boolean
          face_match_score?: number
          fecha_nacimiento?: string | null
          id?: string
          incidents?: number
          kyc_complete?: boolean
          kyc_step?: number
          liveness_ok?: boolean
          nombre?: string
          owner_id: string
          rfc?: string
          risk_factors?: string[]
          risk_level?: string
          risk_score?: number
          selfie_url?: string | null
          telefono?: string
          total_rentals?: number
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          actividad_economica?: string
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          addr_numero?: string
          addr_verified?: boolean
          apellido_materno?: string
          apellido_paterno?: string
          avg_score?: number
          created_at?: string
          curp?: string
          email?: string
          email_verified?: boolean
          face_match_score?: number
          fecha_nacimiento?: string | null
          id?: string
          incidents?: number
          kyc_complete?: boolean
          kyc_step?: number
          liveness_ok?: boolean
          nombre?: string
          owner_id?: string
          rfc?: string
          risk_factors?: string[]
          risk_level?: string
          risk_score?: number
          selfie_url?: string | null
          telefono?: string
          total_rentals?: number
          updated_at?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          addr_calle: string
          addr_ciudad: string
          addr_colonia: string
          addr_cp: string
          addr_estado: string
          addr_numero: string
          alimentos_dia: number
          apellido_materno: string
          apellido_paterno: string
          created_at: string
          edad: number
          foto_url: string | null
          hospedaje_noche: number
          id: string
          nombre: string
          notas: string
          owner_id: string
          salario_dia: number
          telefono: string
          updated_at: string
        }
        Insert: {
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          addr_numero?: string
          alimentos_dia?: number
          apellido_materno?: string
          apellido_paterno?: string
          created_at?: string
          edad?: number
          foto_url?: string | null
          hospedaje_noche?: number
          id?: string
          nombre?: string
          notas?: string
          owner_id: string
          salario_dia?: number
          telefono?: string
          updated_at?: string
        }
        Update: {
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          addr_numero?: string
          alimentos_dia?: number
          apellido_materno?: string
          apellido_paterno?: string
          created_at?: string
          edad?: number
          foto_url?: string | null
          hospedaje_noche?: number
          id?: string
          nombre?: string
          notas?: string
          owner_id?: string
          salario_dia?: number
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          addr_calle: string
          addr_ciudad: string
          addr_colonia: string
          addr_cp: string
          addr_estado: string
          business_name: string
          created_at: string
          id: string
          owner_id: string
          rfc: string
          updated_at: string
        }
        Insert: {
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          business_name?: string
          created_at?: string
          id?: string
          owner_id: string
          rfc?: string
          updated_at?: string
        }
        Update: {
          addr_calle?: string
          addr_ciudad?: string
          addr_colonia?: string
          addr_cp?: string
          addr_estado?: string
          business_name?: string
          created_at?: string
          id?: string
          owner_id?: string
          rfc?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellido_materno: string
          apellido_paterno: string
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nombre: string
          telefono: string
          updated_at: string
        }
        Insert: {
          apellido_materno?: string
          apellido_paterno?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nombre?: string
          telefono?: string
          updated_at?: string
        }
        Update: {
          apellido_materno?: string
          apellido_paterno?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      rental_cases: {
        Row: {
          apartado_comprobante_url: string | null
          apartado_fecha: string | null
          apartado_monto: number
          case_number: string
          cierre_calificacion: number
          cierre_incidentes: string
          contract_pdf_url: string | null
          contrato_firmado: boolean
          contrato_generado: boolean
          contrato_numero: string
          cotizacion_ref: string
          created_at: string
          deposito: number
          destino_viaje: string
          evidence_device_data: string[]
          evidence_face_match_score: number
          evidence_generado: boolean
          evidence_generado_at: string | null
          evidence_ip_logs: string[]
          evidence_otp_validated: boolean
          evidence_timestamps: string[]
          fecha_fin: string | null
          fecha_inicio: string | null
          forma_pago: string
          hora_fin: string
          hora_inicio: string
          id: string
          lugar_devolucion: string
          lugar_entrega: string
          monto_renta: number
          notas: string
          origen_viaje: string
          owner_id: string
          pagare_firmado: boolean
          pagare_generado: boolean
          pagare_numero: string
          pagare_pdf_url: string | null
          pre_filter_result: string | null
          risk_breakdown: Json
          risk_flags: string[]
          risk_level: string
          risk_score: number
          status: string
          tipo_contrato: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          apartado_comprobante_url?: string | null
          apartado_fecha?: string | null
          apartado_monto?: number
          case_number: string
          cierre_calificacion?: number
          cierre_incidentes?: string
          contract_pdf_url?: string | null
          contrato_firmado?: boolean
          contrato_generado?: boolean
          contrato_numero?: string
          cotizacion_ref?: string
          created_at?: string
          deposito?: number
          destino_viaje?: string
          evidence_device_data?: string[]
          evidence_face_match_score?: number
          evidence_generado?: boolean
          evidence_generado_at?: string | null
          evidence_ip_logs?: string[]
          evidence_otp_validated?: boolean
          evidence_timestamps?: string[]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          forma_pago?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          lugar_devolucion?: string
          lugar_entrega?: string
          monto_renta?: number
          notas?: string
          origen_viaje?: string
          owner_id: string
          pagare_firmado?: boolean
          pagare_generado?: boolean
          pagare_numero?: string
          pagare_pdf_url?: string | null
          pre_filter_result?: string | null
          risk_breakdown?: Json
          risk_flags?: string[]
          risk_level?: string
          risk_score?: number
          status?: string
          tipo_contrato?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          apartado_comprobante_url?: string | null
          apartado_fecha?: string | null
          apartado_monto?: number
          case_number?: string
          cierre_calificacion?: number
          cierre_incidentes?: string
          contract_pdf_url?: string | null
          contrato_firmado?: boolean
          contrato_generado?: boolean
          contrato_numero?: string
          cotizacion_ref?: string
          created_at?: string
          deposito?: number
          destino_viaje?: string
          evidence_device_data?: string[]
          evidence_face_match_score?: number
          evidence_generado?: boolean
          evidence_generado_at?: string | null
          evidence_ip_logs?: string[]
          evidence_otp_validated?: boolean
          evidence_timestamps?: string[]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          forma_pago?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          lugar_devolucion?: string
          lugar_entrega?: string
          monto_renta?: number
          notas?: string
          origen_viaje?: string
          owner_id?: string
          pagare_firmado?: boolean
          pagare_generado?: boolean
          pagare_numero?: string
          pagare_pdf_url?: string | null
          pre_filter_result?: string | null
          risk_breakdown?: Json
          risk_flags?: string[]
          risk_level?: string
          risk_score?: number
          status?: string
          tipo_contrato?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_cases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_url: string
          id: string
          label: string
          luxora_user_id: string
          owner_id: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_url: string
          id?: string
          label?: string
          luxora_user_id: string
          owner_id: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          label?: string
          luxora_user_id?: string
          owner_id?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_luxora_user_id_fkey"
            columns: ["luxora_user_id"]
            isOneToOne: false
            referencedRelation: "luxora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_insurances: {
        Row: {
          annual_cost: number
          created_at: string
          expiration_date: string | null
          id: string
          insurance_company: string
          notes: string
          owner_id: string
          phone: string
          policy_pdf_url: string | null
          start_date: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          annual_cost?: number
          created_at?: string
          expiration_date?: string | null
          id?: string
          insurance_company?: string
          notes?: string
          owner_id: string
          phone?: string
          policy_pdf_url?: string | null
          start_date?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          annual_cost?: number
          created_at?: string
          expiration_date?: string | null
          id?: string
          insurance_company?: string
          notes?: string
          owner_id?: string
          phone?: string
          policy_pdf_url?: string | null
          start_date?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_insurances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenances: {
        Row: {
          cost: number
          created_at: string
          id: string
          mileage: number
          next_service_date: string | null
          next_service_mileage: number
          notes: string
          owner_id: string
          service_date: string | null
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          mileage?: number
          next_service_date?: string | null
          next_service_mileage?: number
          notes?: string
          owner_id: string
          service_date?: string | null
          type?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          mileage?: number
          next_service_date?: string | null
          next_service_mileage?: number
          notes?: string
          owner_id?: string
          service_date?: string | null
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_taxes: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          notes: string
          owner_id: string
          paid: boolean
          type: string
          updated_at: string
          vehicle_id: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string
          owner_id: string
          paid?: boolean
          type?: string
          updated_at?: string
          vehicle_id: string
          year?: number
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string
          owner_id?: string
          paid?: boolean
          type?: string
          updated_at?: string
          vehicle_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_taxes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_verifications: {
        Row: {
          created_at: string
          expiration_date: string | null
          hologram_color: string
          hologram_type: string
          id: string
          months_valid: number
          notes: string
          owner_id: string
          updated_at: string
          vehicle_id: string
          verification_date: string | null
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          hologram_color?: string
          hologram_type?: string
          id?: string
          months_valid?: number
          notes?: string
          owner_id: string
          updated_at?: string
          vehicle_id: string
          verification_date?: string | null
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          hologram_color?: string
          hologram_type?: string
          id?: string
          months_valid?: number
          notes?: string
          owner_id?: string
          updated_at?: string
          vehicle_id?: string
          verification_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_verifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          anio: number
          capacidad_pasajeros: number
          color: string
          created_at: string
          foto_url: string | null
          fuel_efficiency_km_per_liter: number
          fuel_type: string
          id: string
          ideal_use_type: string
          kilometraje: number
          marca: string
          modelo: string
          notas: string
          owner_id: string
          placas: string
          renta_dia: number
          status: string
          updated_at: string
          vehicle_category: string
          vin: string
        }
        Insert: {
          anio?: number
          capacidad_pasajeros?: number
          color?: string
          created_at?: string
          foto_url?: string | null
          fuel_efficiency_km_per_liter?: number
          fuel_type?: string
          id?: string
          ideal_use_type?: string
          kilometraje?: number
          marca?: string
          modelo?: string
          notas?: string
          owner_id: string
          placas?: string
          renta_dia?: number
          status?: string
          updated_at?: string
          vehicle_category?: string
          vin?: string
        }
        Update: {
          anio?: number
          capacidad_pasajeros?: number
          color?: string
          created_at?: string
          foto_url?: string | null
          fuel_efficiency_km_per_liter?: number
          fuel_type?: string
          id?: string
          ideal_use_type?: string
          kilometraje?: number
          marca?: string
          modelo?: string
          notas?: string
          owner_id?: string
          placas?: string
          renta_dia?: number
          status?: string
          updated_at?: string
          vehicle_category?: string
          vin?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
