
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "articles_per_day": number,"cross_model": string | null,"extract_model": string | null,"extractions_per_day": number,"id": boolean,"judge_model": string | null,"max_fields_per_project": number,"max_pdfs": number,"max_projects": number,"monthly_budget_usd": number | null,"updated_at": string,"updated_by": string | null,"user_monthly_budget_usd": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "articles_per_day"?: number,"cross_model"?: string | null,"extract_model"?: string | null,"extractions_per_day"?: number,"id"?: boolean,"judge_model"?: string | null,"max_fields_per_project"?: number,"max_pdfs"?: number,"max_projects"?: number,"monthly_budget_usd"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"user_monthly_budget_usd"?: number | null
                  }
                  Update: {
                    "articles_per_day"?: number,"cross_model"?: string | null,"extract_model"?: string | null,"extractions_per_day"?: number,"id"?: boolean,"judge_model"?: string | null,"max_fields_per_project"?: number,"max_pdfs"?: number,"max_projects"?: number,"monthly_budget_usd"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"user_monthly_budget_usd"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"article_fields": {
                  Row: {
                    "agrees": boolean | null,"article_id": string,"audit_answer": string | null,"audit_pending": boolean,"audit_result": string | null,"audited_at": string | null,"auto_approved": boolean,"created_at": string,"edited": boolean,"from_study": boolean | null,"judge_note": string | null,"key": string,"language": string | null,"llm_quote": string | null,"llm_value": string | null,"model": string | null,"model_b": string | null,"pdf_page": number | null,"printed_page": string | null,"quote": string | null,"quote_translated": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"source": string,"source_value": string | null,"status": string,"supported": boolean | null,"value": string,"value_b": string | null,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "agrees"?: boolean | null,"article_id": string,"audit_answer"?: string | null,"audit_pending"?: boolean,"audit_result"?: string | null,"audited_at"?: string | null,"auto_approved"?: boolean,"created_at"?: string,"edited"?: boolean,"from_study"?: boolean | null,"judge_note"?: string | null,"key": string,"language"?: string | null,"llm_quote"?: string | null,"llm_value"?: string | null,"model"?: string | null,"model_b"?: string | null,"pdf_page"?: number | null,"printed_page"?: string | null,"quote"?: string | null,"quote_translated"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source": string,"source_value"?: string | null,"status"?: string,"supported"?: boolean | null,"value": string,"value_b"?: string | null,"verified"?: boolean
                  }
                  Update: {
                    "agrees"?: boolean | null,"article_id"?: string,"audit_answer"?: string | null,"audit_pending"?: boolean,"audit_result"?: string | null,"audited_at"?: string | null,"auto_approved"?: boolean,"created_at"?: string,"edited"?: boolean,"from_study"?: boolean | null,"judge_note"?: string | null,"key"?: string,"language"?: string | null,"llm_quote"?: string | null,"llm_value"?: string | null,"model"?: string | null,"model_b"?: string | null,"pdf_page"?: number | null,"printed_page"?: string | null,"quote"?: string | null,"quote_translated"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"source_value"?: string | null,"status"?: string,"supported"?: boolean | null,"value"?: string,"value_b"?: string | null,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_fields_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    }
                  ]
                },"article_pages": {
                  Row: {
                    "article_id": string,"pdf_page": number,"printed_page": string | null,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"pdf_page": number,"printed_page"?: string | null,"text": string
                  }
                  Update: {
                    "article_id"?: string,"pdf_page"?: number,"printed_page"?: string | null,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_pages_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    }
                  ]
                },"articles": {
                  Row: {
                    "authors": Json | null,"citekey": string | null,"created_at": string,"doi": string | null,"error": string | null,"id": string,"issue": string | null,"language": string | null,"metadata_source": string | null,"notes": string | null,"original_filename": string | null,"page_count": number | null,"pages": string | null,"project_id": string,"sha256": string,"source_url": string | null,"status": string,"storage_path": string,"subtitle": string | null,"tier": string,"title": string | null,"updated_at": string,"venue": string | null,"volume": string | null,"year": number | null,"zotero_key": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "authors"?: Json | null,"citekey"?: string | null,"created_at"?: string,"doi"?: string | null,"error"?: string | null,"id"?: string,"issue"?: string | null,"language"?: string | null,"metadata_source"?: string | null,"notes"?: string | null,"original_filename"?: string | null,"page_count"?: number | null,"pages"?: string | null,"project_id": string,"sha256": string,"source_url"?: string | null,"status"?: string,"storage_path": string,"subtitle"?: string | null,"tier"?: string,"title"?: string | null,"updated_at"?: string,"venue"?: string | null,"volume"?: string | null,"year"?: number | null,"zotero_key"?: string | null
                  }
                  Update: {
                    "authors"?: Json | null,"citekey"?: string | null,"created_at"?: string,"doi"?: string | null,"error"?: string | null,"id"?: string,"issue"?: string | null,"language"?: string | null,"metadata_source"?: string | null,"notes"?: string | null,"original_filename"?: string | null,"page_count"?: number | null,"pages"?: string | null,"project_id"?: string,"sha256"?: string,"source_url"?: string | null,"status"?: string,"storage_path"?: string,"subtitle"?: string | null,"tier"?: string,"title"?: string | null,"updated_at"?: string,"venue"?: string | null,"volume"?: string | null,"year"?: number | null,"zotero_key"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"llm_runs": {
                  Row: {
                    "article_id": string | null,"cost_usd": number | null,"created_at": string,"id": number,"input_tokens": number | null,"latency_ms": number | null,"model": string,"output_tokens": number | null,"prompt_version": string | null,"stage": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id"?: string | null,"cost_usd"?: number | null,"created_at"?: string,"id"?: never,"input_tokens"?: number | null,"latency_ms"?: number | null,"model": string,"output_tokens"?: number | null,"prompt_version"?: string | null,"stage": string,"user_id"?: string | null
                  }
                  Update: {
                    "article_id"?: string | null,"cost_usd"?: number | null,"created_at"?: string,"id"?: never,"input_tokens"?: number | null,"latency_ms"?: number | null,"model"?: string,"output_tokens"?: number | null,"prompt_version"?: string | null,"stage"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "llm_runs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    }
                  ]
                },"project_fields": {
                  Row: {
                    "created_at": string,"instructions": string | null,"key": string,"label": string,"position": number,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"instructions"?: string | null,"key": string,"label": string,"position"?: number,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"instructions"?: string | null,"key"?: string,"label"?: string,"position"?: number,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_fields_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "audit_rate": number,"auto_approve": boolean,"created_at": string,"critical_fields": (string)[],"cross_check": boolean,"id": string,"name": string,"output_language": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audit_rate"?: number,"auto_approve"?: boolean,"created_at"?: string,"critical_fields"?: (string)[],"cross_check"?: boolean,"id"?: string,"name": string,"output_language"?: string,"owner_id"?: string
                  }
                  Update: {
                    "audit_rate"?: number,"auto_approve"?: boolean,"created_at"?: string,"critical_fields"?: (string)[],"cross_check"?: boolean,"id"?: string,"name"?: string,"output_language"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_limits": {
                  Row: {
                    "articles_per_day": number | null,"blocked": boolean,"extractions_per_day": number | null,"max_pdfs": number | null,"max_projects": number | null,"monthly_budget_usd": number | null,"note": string | null,"unlimited_budget": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "articles_per_day"?: number | null,"blocked"?: boolean,"extractions_per_day"?: number | null,"max_pdfs"?: number | null,"max_projects"?: number | null,"monthly_budget_usd"?: number | null,"note"?: string | null,"unlimited_budget"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "articles_per_day"?: number | null,"blocked"?: boolean,"extractions_per_day"?: number | null,"max_pdfs"?: number | null,"max_projects"?: number | null,"monthly_budget_usd"?: number | null,"note"?: string | null,"unlimited_budget"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_month_by_model":
{ Args: Record<PropertyKey, never>; Returns: {
              "cost_usd": number,"model": string,"runs": number
            }[]
                           },
"admin_user_runs":
{ Args: { "max_rows"?: number,"uid": string }; Returns: {
              "article_id": string,"article_title": string,"cost_usd": number,"created_at": string,"id": number,"input_tokens": number,"latency_ms": number,"model": string,"output_tokens": number,"stage": string
            }[]
                           },
"admin_users":
{ Args: Record<PropertyKey, never>; Returns: {
              "articles": number,"created_at": string,"email": string,"full_name": string,"is_admin": boolean,"last_sign_in_at": string,"month_cost": number,"month_runs": number,"projects": number,"total_cost": number,"user_id": string
            }[]
                           },
"llm_block_reason_for_article":
{ Args: { "article": string }; Returns: string
                           },
"my_usage":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"queue_archive":
{ Args: { "msg_id": number }; Returns: boolean
                           },
"queue_read":
{ Args: { "qty": number,"vt_seconds": number }; Returns: unknown[]
                          SetofOptions: {
        from: "*"
        to: "message_record"
        isOneToOne: false
        isSetofReturn: true
      } },
"queue_send":
{ Args: { "delay_seconds"?: number,"msg": Json }; Returns: number
                           },
"request_extract":
{ Args: { "article": string }; Returns: undefined
                           },
"tick_worker":
{ Args: Record<PropertyKey, never>; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
