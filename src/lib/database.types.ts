export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          content: string;
          quiz_questions: any;
          points: number;
          required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          content: string;
          quiz_questions: any;
          points?: number;
          required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          content?: string;
          quiz_questions?: any;
          points?: number;
          required?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_course_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: string;
          attempts: number;
          score: number | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: string;
          attempts?: number;
          score?: number | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          status?: string;
          attempts?: number;
          score?: number | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_ranking: {
        Row: {
          id: string;
          user_id: string;
          rank_tier: string;
          rank_points: number;
          trust_score: number;
          courses_completed: number;
          successful_handoffs: number;
          flags_received: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rank_tier?: string;
          rank_points?: number;
          trust_score?: number;
          courses_completed?: number;
          successful_handoffs?: number;
          flags_received?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rank_tier?: string;
          rank_points?: number;
          trust_score?: number;
          courses_completed?: number;
          successful_handoffs?: number;
          flags_received?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          phone: string | null;
          vehicle_type: string | null;
          tos_version: string | null;
          tos_hash: string | null;
          tos_signed_at: string | null;
          role: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          vehicle_type?: string | null;
          tos_version?: string | null;
          tos_hash?: string | null;
          tos_signed_at?: string | null;
          role?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          vehicle_type?: string | null;
          tos_version?: string | null;
          tos_hash?: string | null;
          tos_signed_at?: string | null;
          role?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      parking_spots: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          address: string;
          departure_time: string;
          return_time: string | null;
          created_at: string;
          status: "active" | "taken" | "expired";
          tip_message: string | null;
          claimed_by: string | null;
          vehicle_type: string | null;
          lead_minutes: number | null;
          expires_at: string | null;
          flag_count: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          address: string;
          departure_time: string;
          return_time?: string | null;
          created_at?: string;
          status?: "active" | "taken" | "expired";
          tip_message?: string | null;
          claimed_by?: string | null;
          vehicle_type?: string | null;
          lead_minutes?: number | null;
          expires_at?: string | null;
          flag_count?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          departure_time?: string;
          return_time?: string | null;
          created_at?: string;
          status?: "active" | "taken" | "expired";
          tip_message?: string | null;
          claimed_by?: string | null;
          vehicle_type?: string | null;
          lead_minutes?: number | null;
          expires_at?: string | null;
          flag_count?: number | null;
        };
        Relationships: [];
      };
      spot_matches: {
        Row: {
          id: string;
          spot_id: string;
          spot_owner_id: string;
          seeker_id: string;
          status: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          spot_id: string;
          spot_owner_id: string;
          seeker_id: string;
          status?: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          spot_id?: string;
          spot_owner_id?: string;
          seeker_id?: string;
          status?: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tips: {
        Row: {
          id: string;
          spot_id: string;
          sender_id: string;
          amount: number;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          spot_id: string;
          sender_id: string;
          amount: number;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          spot_id?: string;
          sender_id?: string;
          amount?: number;
          message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contribution_stats: {
        Row: {
          id: string;
          user_id: string;
          spots_posted: number;
          spots_claimed: number;
          hours_saved: number;
          streak_7d: number;
          streak_30d: number;
          neighborhood: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spots_posted?: number;
          spots_claimed?: number;
          hours_saved?: number;
          streak_7d?: number;
          streak_30d?: number;
          neighborhood?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          spots_posted?: number;
          spots_claimed?: number;
          hours_saved?: number;
          streak_7d?: number;
          streak_30d?: number;
          neighborhood?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ephemeral_chats: {
        Row: {
          id: string;
          spot_id: string;
          sender_id: string;
          receiver_id: string;
          status: "active" | "completed" | "expired";
          created_at: string;
          expires_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          spot_id: string;
          sender_id: string;
          receiver_id: string;
          status?: "active" | "completed" | "expired";
          created_at?: string;
          expires_at: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          spot_id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: "active" | "completed" | "expired";
          created_at?: string;
          expires_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      ephemeral_messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      departure_pings: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          leaving_in_minutes: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          leaving_in_minutes: number;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          leaving_in_minutes?: number;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      spot_requests: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          vehicle_type: string | null;
          status: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          vehicle_type?: string | null;
          status?: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          vehicle_type?: string | null;
          status?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      ads: {
        Row: {
          id: string;
          title: string;
          image_url: string | null;
          link_url: string | null;
          business_name: string;
          tagline: string | null;
          target_lat: number | null;
          target_lng: number | null;
          target_radius_meters: number | null;
          start_date: string;
          end_date: string | null;
          active: boolean;
          impressions: number;
          clicks: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          image_url?: string | null;
          link_url?: string | null;
          business_name: string;
          tagline?: string | null;
          target_lat?: number | null;
          target_lng?: number | null;
          target_radius_meters?: number | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          impressions?: number;
          clicks?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          image_url?: string | null;
          link_url?: string | null;
          business_name?: string;
          tagline?: string | null;
          target_lat?: number | null;
          target_lng?: number | null;
          target_radius_meters?: number | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          impressions?: number;
          clicks?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_: string]: never;
    };
    Functions: {
      cleanup_ephemeral_chats: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      cleanup_departure_pings: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      maintain_streaks: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      ensure_user_exists: {
        Args: { p_user_id: string };
        Returns: unknown;
      };
    };
    Enums: {
      [_: string]: never;
    };
  };
}
