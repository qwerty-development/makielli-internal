export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      balance_discrepancy_log: {
        Row: {
          calculated_balance: number
          client_id: number
          discrepancy: number
          id: number
          logged_at: string | null
          stored_balance: number
        }
        Insert: {
          calculated_balance: number
          client_id: number
          discrepancy: number
          id?: number
          logged_at?: string | null
          stored_balance: number
        }
        Update: {
          calculated_balance?: number
          client_id?: number
          discrepancy?: number
          id?: number
          logged_at?: string | null
          stored_balance?: number
        }
        Relationships: []
      }
      ClientGroups: {
        Row: {
          group_id: number
          name: string
        }
        Insert: {
          group_id?: number
          name: string
        }
        Update: {
          group_id?: number
          name?: string
        }
        Relationships: []
      }
      ClientInvoices: {
        Row: {
          client_id: number | null
          created_at: string
          currency: string | null
          delivery_date: string | null
          discounts: Json | null
          files: string[] | null
          id: number
          include_vat: boolean | null
          order_number: string | null
          payment_info: string
          payment_term: string | null
          products: Json[] | null
          quotation_id: number | null
          remaining_amount: number | null
          shipping_fee: number
          total_price: number | null
          type: string | null
          vat_amount: number | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          files?: string[] | null
          id?: number
          include_vat?: boolean | null
          order_number?: string | null
          payment_info?: string
          payment_term?: string | null
          products?: Json[] | null
          quotation_id?: number | null
          remaining_amount?: number | null
          shipping_fee: number
          total_price?: number | null
          type?: string | null
          vat_amount?: number | null
        }
        Update: {
          client_id?: number | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          files?: string[] | null
          id?: number
          include_vat?: boolean | null
          order_number?: string | null
          payment_info?: string
          payment_term?: string | null
          products?: Json[] | null
          quotation_id?: number | null
          remaining_amount?: number | null
          shipping_fee?: number
          total_price?: number | null
          type?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ClientInvoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_balance_analysis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ClientInvoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "Clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ClientInvoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: true
            referencedRelation: "Quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      ClientReceipts: {
        Row: {
          amount: number | null
          client_id: number | null
          currency: string | null
          files: string[] | null
          id: number
          invoice_id: number | null
          paid_at: string
        }
        Insert: {
          amount?: number | null
          client_id?: number | null
          currency?: string | null
          files?: string[] | null
          id?: number
          invoice_id?: number | null
          paid_at?: string
        }
        Update: {
          amount?: number | null
          client_id?: number | null
          currency?: string | null
          files?: string[] | null
          id?: number
          invoice_id?: number | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ClientReceipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_balance_analysis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ClientReceipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "Clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ClientReceipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ClientInvoices"
            referencedColumns: ["id"]
          },
        ]
      }
      Clients: {
        Row: {
          address: string | null
          balance: number
          client_id: number
          company_id: number | null
          email: string | null
          group_id: number | null
          name: string
          phone: string | null
          tax_number: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          client_id?: number
          company_id?: number | null
          email?: string | null
          group_id?: number | null
          name: string
          phone?: string | null
          tax_number?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          client_id?: number
          company_id?: number | null
          email?: string | null
          group_id?: number | null
          name?: string
          phone?: string | null
          tax_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ClientGroups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_address: string | null
          bank_name: string | null
          bank_routing_number: string | null
          id: number
          identification_number: string | null
          identification_type: string | null
          name: string
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          id?: number
          identification_number?: string | null
          identification_type?: string | null
          name: string
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          id?: number
          identification_number?: string | null
          identification_type?: string | null
          name?: string
        }
        Relationships: []
      }
      ProductHistory: {
        Row: {
          change_type: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          product_id: string
          quantity_change: number | null
          source_id: string | null
          source_reference: string | null
          source_type: string
          variant_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          product_id: string
          quantity_change?: number | null
          source_id?: string | null
          source_reference?: string | null
          source_type: string
          variant_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          product_id?: string
          quantity_change?: number | null
          source_id?: string | null
          source_reference?: string | null
          source_type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producthistory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "Products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producthistory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ProductVariants"
            referencedColumns: ["id"]
          },
        ]
      }
      Products: {
        Row: {
          cost: number | null
          description: string | null
          id: string
          name: string
          photo: string | null
          price: number
          type: string | null
        }
        Insert: {
          cost?: number | null
          description?: string | null
          id?: string
          name: string
          photo?: string | null
          price: number
          type?: string | null
        }
        Update: {
          cost?: number | null
          description?: string | null
          id?: string
          name?: string
          photo?: string | null
          price?: number
          type?: string | null
        }
        Relationships: []
      }
      ProductVariants: {
        Row: {
          color: string | null
          id: string
          product_id: string | null
          quantity: number
          size: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ProductVariants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "Products"
            referencedColumns: ["id"]
          },
        ]
      }
      Quotations: {
        Row: {
          client_id: number | null
          created_at: string
          currency: string | null
          delivery_date: string | null
          discounts: Json | null
          id: number
          include_vat: boolean | null
          note: string | null
          order_number: string | null
          payment_info: string | null
          payment_term: string | null
          products: Json[] | null
          shipping_fee: number
          status: string | null
          total_price: number | null
          vat_amount: number | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          id?: number
          include_vat?: boolean | null
          note?: string | null
          order_number?: string | null
          payment_info?: string | null
          payment_term?: string | null
          products?: Json[] | null
          shipping_fee?: number
          status?: string | null
          total_price?: number | null
          vat_amount?: number | null
        }
        Update: {
          client_id?: number | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          id?: number
          include_vat?: boolean | null
          note?: string | null
          order_number?: string | null
          payment_info?: string | null
          payment_term?: string | null
          products?: Json[] | null
          shipping_fee?: number
          status?: string | null
          total_price?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_balance_analysis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "Quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "Clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      SupplierInvoices: {
        Row: {
          created_at: string
          currency: string | null
          delivery_date: string | null
          discounts: Json | null
          files: string[] | null
          id: number
          include_vat: boolean | null
          order_number: string | null
          payment_info: string
          payment_term: string | null
          products: Json[] | null
          remaining_amount: number | null
          shipping_fee: number
          supplier_id: string | null
          total_price: number | null
          vat_amount: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          files?: string[] | null
          id?: number
          include_vat?: boolean | null
          order_number?: string | null
          payment_info?: string
          payment_term?: string | null
          products?: Json[] | null
          remaining_amount?: number | null
          shipping_fee?: number
          supplier_id?: string | null
          total_price?: number | null
          vat_amount?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          discounts?: Json | null
          files?: string[] | null
          id?: number
          include_vat?: boolean | null
          order_number?: string | null
          payment_info?: string
          payment_term?: string | null
          products?: Json[] | null
          remaining_amount?: number | null
          shipping_fee?: number
          supplier_id?: string | null
          total_price?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "SupplierInvoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "Suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      SupplierReceipts: {
        Row: {
          amount: number | null
          currency: string | null
          files: string[] | null
          id: number
          invoice_id: number | null
          paid_at: string
          supplier_id: string | null
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          files?: string[] | null
          id?: number
          invoice_id?: number | null
          paid_at?: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number | null
          currency?: string | null
          files?: string[] | null
          id?: number
          invoice_id?: number | null
          paid_at?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SupplierReceipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "SupplierInvoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SupplierReceipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "Suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      Suppliers: {
        Row: {
          balance: number
          company_id: number | null
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
        }
        Insert: {
          balance: number
          company_id?: number | null
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          balance?: number
          company_id?: number | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_balance_analysis: {
        Row: {
          calculated_balance: number | null
          client_id: number | null
          current_database_balance: number | null
          difference: number | null
          name: string | null
          status: string | null
        }
        Relationships: []
      }
      product_inventory_summary: {
        Row: {
          color: string | null
          current_quantity: number | null
          last_updated: string | null
          product_id: string | null
          product_name: string | null
          size: string | null
          total_in: number | null
          total_out: number | null
          transaction_count: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producthistory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "Products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producthistory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ProductVariants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales_history: {
        Row: {
          client_email: string | null
          client_id: number | null
          client_name: string | null
          client_phone: string | null
          color: string | null
          created_at: string | null
          currency: string | null
          current_stock: number | null
          id: string | null
          invoice_order_number: string | null
          invoice_total: number | null
          invoice_type: string | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          product_photo: string | null
          product_price: number | null
          quantity_change: number | null
          quotation_id: number | null
          quotation_order_number: string | null
          size: string | null
          source_id: string | null
          source_reference: string | null
          source_type: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producthistory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "Products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producthistory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ProductVariants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_client_balance: {
        Args: { client_id_param: number }
        Returns: number
      }
      get_inventory_time_series: {
        Args: { end_date: string; start_date: string; time_interval?: string }
        Returns: {
          date: string
          purchases: number
          sales: number
        }[]
      }
      get_inventory_value_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_low_stock_products: {
        Args: { threshold?: number }
        Returns: {
          color: string
          product_id: string
          product_name: string
          quantity: number
          size: string
          variant_id: string
        }[]
      }
      get_product_history_summary: {
        Args: { p_product_id: string }
        Returns: {
          avg_sale_quantity: number
          first_sale_date: string
          last_sale_date: string
          total_adjusted: number
          total_purchased: number
          total_sold: number
          unique_customers: number
        }[]
      }
      get_product_sales: {
        Args: { end_date: string; start_date: string }
        Returns: {
          product_id: string
          product_name: string
          total_revenue: number
          total_sold: number
          variant_data: Json
        }[]
      }
      get_sales_kpis: {
        Args: {
          current_end: string
          current_start: string
          prev_end: string
          prev_start: string
        }
        Returns: Json
      }
      get_top_selling_products: {
        Args: { end_date: string; items_limit?: number; start_date: string }
        Returns: {
          popular_variant_color: string
          popular_variant_size: string
          product_id: string
          product_name: string
          product_photo: string
          quantity_sold: number
          revenue: number
        }[]
      }
      get_variant_sales_details: {
        Args: { p_product_id: string }
        Returns: {
          color: string
          current_stock: number
          size: string
          total_sold: number
          unique_customers: number
          variant_id: string
        }[]
      }
      update_entity_balance: {
        Args: {
          balance_change: number
          entity_id: string
          entity_table: string
        }
        Returns: undefined
      }
      update_product_variant_quantity: {
        Args: { quantity_change: number; variant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      product_condition: "good" | "damaged" | "defective"
      return_status: "pending" | "approved" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      product_condition: ["good", "damaged", "defective"],
      return_status: ["pending", "approved", "rejected"],
    },
  },
} as const

