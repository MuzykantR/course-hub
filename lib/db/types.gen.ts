export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor: string;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          meta: Json;
        };
        Insert: {
          action: string;
          actor: string;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: never;
          meta?: Json;
        };
        Update: {
          action?: string;
          actor?: string;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          meta?: Json;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      lesson_groups: {
        Row: {
          group_id: number;
          lesson_id: number;
        };
        Insert: {
          group_id: number;
          lesson_id: number;
        };
        Update: {
          group_id?: number;
          lesson_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_groups_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_groups_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string;
          date: string;
          description_md: string;
          id: number;
          number: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          description_md?: string;
          id?: never;
          number: number;
          title: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          description_md?: string;
          id?: never;
          number?: number;
          title?: string;
        };
        Relationships: [];
      };
      rate_events: {
        Row: {
          created_at: string;
          id: number;
          key: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          key: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          key?: string;
        };
        Relationships: [];
      };
      report_assets: {
        Row: {
          created_at: string;
          id: number;
          mime: string;
          path: string;
          report_id: number;
          size: number;
        };
        Insert: {
          created_at?: string;
          id?: never;
          mime: string;
          path: string;
          report_id: number;
          size: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          mime?: string;
          path?: string;
          report_id?: number;
          size?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'report_assets_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
        ];
      };
      report_authors: {
        Row: {
          report_id: number;
          student_id: number;
        };
        Insert: {
          report_id: number;
          student_id: number;
        };
        Update: {
          report_id?: number;
          student_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'report_authors_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_authors_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          content_hash: string;
          content_md: string;
          created_at: string;
          group_id: number;
          id: number;
          lesson_id: number | null;
          library: string;
          review_comment: string | null;
          reviewed_at: string | null;
          search: unknown;
          slug: string;
          status: string;
          summary: string;
          tags: string[];
          title: string;
        };
        Insert: {
          content_hash: string;
          content_md: string;
          created_at?: string;
          group_id: number;
          id?: never;
          lesson_id?: number | null;
          library?: string;
          review_comment?: string | null;
          reviewed_at?: string | null;
          search?: unknown;
          slug: string;
          status?: string;
          summary?: string;
          tags?: string[];
          title: string;
        };
        Update: {
          content_hash?: string;
          content_md?: string;
          created_at?: string;
          group_id?: number;
          id?: never;
          lesson_id?: number | null;
          library?: string;
          review_comment?: string | null;
          reviewed_at?: string | null;
          search?: unknown;
          slug?: string;
          status?: string;
          summary?: string;
          tags?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      settings: {
        Row: {
          course_password_hash: string;
          github_export_enabled: boolean;
          github_last_commit_url: string | null;
          github_last_export_at: string | null;
          github_last_export_message: string | null;
          github_last_export_ok: boolean | null;
          id: boolean;
          pwd_version: number;
          submissions_open: boolean;
          updated_at: string;
        };
        Insert: {
          course_password_hash: string;
          github_export_enabled?: boolean;
          github_last_commit_url?: string | null;
          github_last_export_at?: string | null;
          github_last_export_message?: string | null;
          github_last_export_ok?: boolean | null;
          id?: boolean;
          pwd_version?: number;
          submissions_open?: boolean;
          updated_at?: string;
        };
        Update: {
          course_password_hash?: string;
          github_export_enabled?: boolean;
          github_last_commit_url?: string | null;
          github_last_export_at?: string | null;
          github_last_export_message?: string | null;
          github_last_export_ok?: boolean | null;
          id?: boolean;
          pwd_version?: number;
          submissions_open?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      solutions: {
        Row: {
          author_student_id: number;
          code: string;
          content_hash: string;
          created_at: string;
          explanation_md: string | null;
          id: number;
          is_featured: boolean;
          review_comment: string | null;
          reviewed_at: string | null;
          status: string;
          task_id: number;
        };
        Insert: {
          author_student_id: number;
          code: string;
          content_hash: string;
          created_at?: string;
          explanation_md?: string | null;
          id?: never;
          is_featured?: boolean;
          review_comment?: string | null;
          reviewed_at?: string | null;
          status?: string;
          task_id: number;
        };
        Update: {
          author_student_id?: number;
          code?: string;
          content_hash?: string;
          created_at?: string;
          explanation_md?: string | null;
          id?: never;
          is_featured?: boolean;
          review_comment?: string | null;
          reviewed_at?: string | null;
          status?: string;
          task_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'solutions_author_student_id_fkey';
            columns: ['author_student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solutions_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      students: {
        Row: {
          created_at: string;
          full_name: string;
          group_id: number;
          id: number;
          pin_failed_count: number;
          pin_hash: string | null;
          pin_locked_until: string | null;
          pin_version: number;
          slug: string;
          submissions_blocked: boolean;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          group_id: number;
          id?: never;
          pin_failed_count?: number;
          pin_hash?: string | null;
          pin_locked_until?: string | null;
          pin_version?: number;
          slug: string;
          submissions_blocked?: boolean;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          group_id?: number;
          id?: never;
          pin_failed_count?: number;
          pin_hash?: string | null;
          pin_locked_until?: string | null;
          pin_version?: number;
          slug?: string;
          submissions_blocked?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'students_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_student_id: number | null;
          created_at: string;
          difficulty: string;
          id: number;
          lesson_id: number;
          order: number;
          search: unknown;
          statement_md: string;
          status: string;
          tags: string[];
          tests: Json | null;
          title: string;
        };
        Insert: {
          assigned_student_id?: number | null;
          created_at?: string;
          difficulty?: string;
          id?: never;
          lesson_id: number;
          order?: number;
          search?: unknown;
          statement_md?: string;
          status?: string;
          tags?: string[];
          tests?: Json | null;
          title: string;
        };
        Update: {
          assigned_student_id?: number | null;
          created_at?: string;
          difficulty?: string;
          id?: never;
          lesson_id?: number;
          order?: number;
          search?: unknown;
          statement_md?: string;
          status?: string;
          tags?: string[];
          tests?: Json | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_student_id_fkey';
            columns: ['assigned_student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      kb_items: {
        Row: {
          created_at: string | null;
          date: string | null;
          difficulty: string | null;
          group_ids: number[] | null;
          id: number | null;
          lesson_id: number | null;
          search: unknown;
          slug: string | null;
          student_ids: number[] | null;
          tags: string[] | null;
          title: string | null;
          type: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      pin_attempt_begin: {
        Args: { p_lock: unknown; p_max: number; p_student_id: number };
        Returns: {
          allowed: boolean;
          attempts_left: number;
          locked_until: string;
        }[];
      };
      pin_attempt_success: {
        Args: { p_student_id: number };
        Returns: undefined;
      };
      tags_to_text: { Args: { tags: string[] }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
