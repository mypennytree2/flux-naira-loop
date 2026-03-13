export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      collateral_deposits: {
        Row: {
          amount: number
          amount_ngn: number | null
          amount_usd: number | null
          asset: string
          confirmations_received: number | null
          confirmations_required: number | null
          created_at: string | null
          id: string
          loan_id: string | null
          locked_at: string | null
          network: string | null
          released_at: string | null
          smart_contract_id: string | null
          status: string | null
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          amount_ngn?: number | null
          amount_usd?: number | null
          asset: string
          confirmations_received?: number | null
          confirmations_required?: number | null
          created_at?: string | null
          id?: string
          loan_id?: string | null
          locked_at?: string | null
          network?: string | null
          released_at?: string | null
          smart_contract_id?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          amount_ngn?: number | null
          amount_usd?: number | null
          asset?: string
          confirmations_received?: number | null
          confirmations_required?: number | null
          created_at?: string | null
          id?: string
          loan_id?: string | null
          locked_at?: string | null
          network?: string | null
          released_at?: string | null
          smart_contract_id?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collateral_deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayments: {
        Row: {
          amount_ngn: number
          created_at: string | null
          id: string
          interest_portion: number | null
          loan_id: string
          payment_method: string | null
          principal_portion: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_ngn: number
          created_at?: string | null
          id?: string
          interest_portion?: number | null
          loan_id: string
          payment_method?: string | null
          principal_portion?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_ngn?: number
          created_at?: string | null
          id?: string
          interest_portion?: number | null
          loan_id?: string
          payment_method?: string | null
          principal_portion?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_repayments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          accrued_interest_ngn: number | null
          approval_tat_minutes: number | null
          approval_type: string | null
          approved_at: string | null
          collateral_amount: number
          collateral_asset: string
          collateral_deposit_id: string | null
          collateral_value_ngn: number
          created_at: string | null
          current_ltv: number | null
          daily_rate: number | null
          disbursed_at: string | null
          fx_adjusted_margin_call_ltv: number | null
          fx_volatility_flag: boolean | null
          id: string
          lending_license_ref: string | null
          liquidation_ltv: number | null
          loan_amount_ngn: number
          margin_call_ltv: number | null
          margin_call_triggered: boolean | null
          margin_call_triggered_at: string | null
          max_ltv: number
          net_disbursed_ngn: number
          origination_fee_ngn: number
          outstanding_principal_ngn: number
          repaid_at: string | null
          status: string | null
          total_outstanding_ngn: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accrued_interest_ngn?: number | null
          approval_tat_minutes?: number | null
          approval_type?: string | null
          approved_at?: string | null
          collateral_amount: number
          collateral_asset: string
          collateral_deposit_id?: string | null
          collateral_value_ngn: number
          created_at?: string | null
          current_ltv?: number | null
          daily_rate?: number | null
          disbursed_at?: string | null
          fx_adjusted_margin_call_ltv?: number | null
          fx_volatility_flag?: boolean | null
          id?: string
          lending_license_ref?: string | null
          liquidation_ltv?: number | null
          loan_amount_ngn: number
          margin_call_ltv?: number | null
          margin_call_triggered?: boolean | null
          margin_call_triggered_at?: string | null
          max_ltv: number
          net_disbursed_ngn: number
          origination_fee_ngn: number
          outstanding_principal_ngn: number
          repaid_at?: string | null
          status?: string | null
          total_outstanding_ngn: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accrued_interest_ngn?: number | null
          approval_tat_minutes?: number | null
          approval_type?: string | null
          approved_at?: string | null
          collateral_amount?: number
          collateral_asset?: string
          collateral_deposit_id?: string | null
          collateral_value_ngn?: number
          created_at?: string | null
          current_ltv?: number | null
          daily_rate?: number | null
          disbursed_at?: string | null
          fx_adjusted_margin_call_ltv?: number | null
          fx_volatility_flag?: boolean | null
          id?: string
          lending_license_ref?: string | null
          liquidation_ltv?: number | null
          loan_amount_ngn?: number
          margin_call_ltv?: number | null
          margin_call_triggered?: boolean | null
          margin_call_triggered_at?: string | null
          max_ltv?: number
          net_disbursed_ngn?: number
          origination_fee_ngn?: number
          outstanding_principal_ngn?: number
          repaid_at?: string | null
          status?: string | null
          total_outstanding_ngn?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_collateral_deposit_id_fkey"
            columns: ["collateral_deposit_id"]
            isOneToOne: false
            referencedRelation: "collateral_deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nip_transfers: {
        Row: {
          amount_ngn: number
          completed_at: string | null
          created_at: string | null
          fee_ngn: number | null
          id: string
          narration: string | null
          nip_response_code: string | null
          nip_session_id: string | null
          recipient_account_name: string | null
          recipient_account_number: string
          recipient_bank_code: string
          recipient_bank_name: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_ngn: number
          completed_at?: string | null
          created_at?: string | null
          fee_ngn?: number | null
          id?: string
          narration?: string | null
          nip_response_code?: string | null
          nip_session_id?: string | null
          recipient_account_name?: string | null
          recipient_account_number: string
          recipient_bank_code: string
          recipient_bank_name?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_ngn?: number
          completed_at?: string | null
          created_at?: string | null
          fee_ngn?: number | null
          id?: string
          narration?: string | null
          nip_response_code?: string | null
          nip_session_id?: string | null
          recipient_account_name?: string | null
          recipient_account_number?: string
          recipient_bank_code?: string
          recipient_bank_name?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nip_transfers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_feed: {
        Row: {
          asset: string
          change_24h_pct: number | null
          price_ngn: number | null
          price_usd: number | null
          updated_at: string | null
          volatility_24h_pct: number | null
        }
        Insert: {
          asset: string
          change_24h_pct?: number | null
          price_ngn?: number | null
          price_usd?: number | null
          updated_at?: string | null
          volatility_24h_pct?: number | null
        }
        Update: {
          asset?: string
          change_24h_pct?: number | null
          price_ngn?: number | null
          price_usd?: number | null
          updated_at?: string | null
          volatility_24h_pct?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bvn: string | null
          bvn_verified: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_status: string | null
          kyc_tier: number | null
          nin: string | null
          nin_verified: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          bvn?: string | null
          bvn_verified?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          kyc_status?: string | null
          kyc_tier?: number | null
          nin?: string | null
          nin_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          bvn?: string | null
          bvn_verified?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          kyc_tier?: number | null
          nin?: string | null
          nin_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transaction_flags: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          flag_details: Json | null
          flag_severity: string | null
          flag_type: string | null
          id: string
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          flag_details?: Json | null
          flag_severity?: string | null
          flag_type?: string | null
          id?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          flag_details?: Json | null
          flag_severity?: string | null
          flag_type?: string | null
          id?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string | null
          crypto_deposit_address: string | null
          crypto_deposit_address_solana: string | null
          crypto_deposit_address_xrp: string | null
          id: string
          ngn_account_name: string | null
          ngn_account_number: string | null
          ngn_balance: number | null
          ngn_bank_code: string | null
          ngn_bank_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crypto_deposit_address?: string | null
          crypto_deposit_address_solana?: string | null
          crypto_deposit_address_xrp?: string | null
          id?: string
          ngn_account_name?: string | null
          ngn_account_number?: string | null
          ngn_balance?: number | null
          ngn_bank_code?: string | null
          ngn_bank_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crypto_deposit_address?: string | null
          crypto_deposit_address_solana?: string | null
          crypto_deposit_address_xrp?: string | null
          id?: string
          ngn_account_name?: string | null
          ngn_account_number?: string | null
          ngn_balance?: number | null
          ngn_bank_code?: string | null
          ngn_bank_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
