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
          phone_number: string | null;
          phone_verified: boolean | null;
          phone_verified_at: string | null;
          schedule_arrival: string | null;
          schedule_departure: string | null;
          schedule_days: number[] | null;
          match_credits: number;
          notification_prefs: { [key: string]: boolean };
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
          phone_number?: string | null;
          phone_verified?: boolean | null;
          phone_verified_at?: string | null;
          schedule_arrival?: string | null;
          schedule_departure?: string | null;
          schedule_days?: number[] | null;
          match_credits?: number;
          notification_prefs?: { [key: string]: boolean };
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
          phone_number?: string | null;
          phone_verified?: boolean | null;
          phone_verified_at?: string | null;
          schedule_arrival?: string | null;
          schedule_departure?: string | null;
          schedule_days?: number[] | null;
          match_credits?: number;
          notification_prefs?: { [key: string]: boolean };
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
          relay_mode: "imminent" | "scheduled";
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
          relay_mode?: "imminent" | "scheduled";
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
          relay_mode?: "imminent" | "scheduled";
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
      driver_locations: {
        Row: {
          id: string;
          user_id: string;
          match_id: string | null;
          latitude: number;
          longitude: number;
          heading: number | null;
          speed: number | null;
          accuracy: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id?: string | null;
          latitude: number;
          longitude: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string | null;
          latitude?: number;
          longitude?: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      active_sessions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          role: string;
          status: string;
          eta_seconds: number | null;
          grace_period_ends_at: string | null;
          arrived_at: string | null;
          departed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          role: string;
          status?: string;
          eta_seconds?: number | null;
          grace_period_ends_at?: string | null;
          arrived_at?: string | null;
          departed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          role?: string;
          status?: string;
          eta_seconds?: number | null;
          grace_period_ends_at?: string | null;
          arrived_at?: string | null;
          departed_at?: string | null;
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
      user_game_profile: {
        Row: {
          id: string;
          user_id: string;
          total_xp: number;
          level: number;
          current_streak: number;
          longest_streak: number;
          last_handoff_date: string | null;
          perfect_parks: number;
          total_handoffs_xp: number;
          total_bonus_xp: number;
          onboarding_seen: boolean;
          game_mode_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_xp?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_handoff_date?: string | null;
          perfect_parks?: number;
          total_handoffs_xp?: number;
          total_bonus_xp?: number;
          onboarding_seen?: boolean;
          game_mode_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_xp?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_handoff_date?: string | null;
          perfect_parks?: number;
          total_handoffs_xp?: number;
          total_bonus_xp?: number;
          onboarding_seen?: boolean;
          game_mode_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_transactions: {
        Row: {
          id: string;
          user_id: string;
          xp_amount: number;
          xp_type: string;
          description: string;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          xp_amount: number;
          xp_type: string;
          description: string;
          metadata?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          xp_amount?: number;
          xp_type?: string;
          description?: string;
          metadata?: any | null;
          created_at?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon_emoji: string;
          category: string;
          tier: string;
          xp_reward: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          icon_emoji?: string;
          category?: string;
          tier?: string;
          xp_reward?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon_emoji?: string;
          category?: string;
          tier?: string;
          xp_reward?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
          seen: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
          seen?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
          seen?: boolean;
        };
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          name: string;
          description: string;
          quest_type: string;
          icon_emoji: string;
          target_count: number;
          action_type: string;
          xp_reward: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          quest_type: string;
          icon_emoji?: string;
          target_count?: number;
          action_type: string;
          xp_reward?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          quest_type?: string;
          icon_emoji?: string;
          target_count?: number;
          action_type?: string;
          xp_reward?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_quests: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string;
          current_count: number;
          target_count: number;
          completed: boolean;
          completed_at: string | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_id: string;
          current_count?: number;
          target_count: number;
          completed?: boolean;
          completed_at?: string | null;
          period_start?: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_id?: string;
          current_count?: number;
          target_count?: number;
          completed?: boolean;
          completed_at?: string | null;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          quantity: number;
          unit_price: number;
          total_cents: number;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          quantity: number;
          unit_price: number;
          total_cents: number;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          quantity?: number;
          unit_price?: number;
          total_cents?: number;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      device_push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth_key?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      car_locations: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          parked_at: string;
          status: string;
          walking_eta_seconds: number | null;
          walking_back_detected_at: string | null;
          departed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          parked_at?: string;
          status?: string;
          walking_eta_seconds?: number | null;
          walking_back_detected_at?: string | null;
          departed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          parked_at?: string;
          status?: string;
          walking_eta_seconds?: number | null;
          walking_back_detected_at?: string | null;
          departed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "car_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_parking_spots: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          latitude: number;
          longitude: number;
          address: string | null;
          accuracy: number | null;
          saved_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          latitude: number;
          longitude: number;
          address?: string | null;
          accuracy?: number | null;
          saved_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          latitude?: number;
          longitude?: number;
          address?: string | null;
          accuracy?: number | null;
          saved_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_schedules: {
        Row: {
          id: string;
          user_id: string;
          saved_spot_id: string | null;
          latitude: number;
          longitude: number;
          label: string | null;
          days_of_week: number[];
          departure_time: string;
          return_time: string;
          vehicle_type: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          saved_spot_id?: string | null;
          latitude: number;
          longitude: number;
          label?: string | null;
          days_of_week?: number[];
          departure_time: string;
          return_time: string;
          vehicle_type?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          saved_spot_id?: string | null;
          latitude?: number;
          longitude?: number;
          label?: string | null;
          days_of_week?: number[];
          departure_time?: string;
          return_time?: string;
          vehicle_type?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      pilot_areas: {
        Row: {
          id: string;
          name: string;
          min_lat: number;
          max_lat: number;
          min_lng: number;
          max_lng: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          min_lat: number;
          max_lat: number;
          min_lng: number;
          max_lng: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          min_lat?: number;
          max_lat?: number;
          min_lng?: number;
          max_lng?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      street_sweeping: {
        Row: {
          id: string;
          street_name: string;
          city: string;
          day_of_week: string;
          time_start: string;
          time_end: string;
          zone: string;
          holiday_exemptions: string[];
        };
        Insert: {
          id?: string;
          street_name: string;
          city?: string;
          day_of_week: string;
          time_start: string;
          time_end: string;
          zone?: string;
          holiday_exemptions?: string[];
        };
        Update: {
          id?: string;
          street_name?: string;
          city?: string;
          day_of_week?: string;
          time_start?: string;
          time_end?: string;
          zone?: string;
          holiday_exemptions?: string[];
        };
        Relationships: [];
      };
      street_sweeping_alerts: {
        Row: {
          id: string;
          user_id: string;
          street_name: string;
          alert_time: string;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          street_name: string;
          alert_time: string;
          notified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          street_name?: string;
          alert_time?: string;
          notified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      spot_flags: {
        Row: {
          id: string;
          spot_id: string;
          flagged_by_user_id: string;
          flag_type: "wrong_location" | "fake_spot" | "rude_user" | "dangerous_behavior" | "other";
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          spot_id: string;
          flagged_by_user_id: string;
          flag_type: "wrong_location" | "fake_spot" | "rude_user" | "dangerous_behavior" | "other";
          comment?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          spot_id?: string;
          flagged_by_user_id?: string;
          flag_type?: "wrong_location" | "fake_spot" | "rude_user" | "dangerous_behavior" | "other";
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      spot_waitlist: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          vehicle_type: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          vehicle_type?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          vehicle_type?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_ratings: {
        Row: {
          id: string;
          rated_by_user_id: string;
          rated_user_id: string;
          rating: number;
          comment: string;
          spot_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rated_by_user_id: string;
          rated_user_id: string;
          rating: number;
          comment?: string;
          spot_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rated_by_user_id?: string;
          rated_user_id?: string;
          rating?: number;
          comment?: string;
          spot_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      congestion_alerts: {
        Row: {
          id: string;
          neighborhood: string;
          alert_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          neighborhood: string;
          alert_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          neighborhood?: string;
          alert_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ad_analytics: {
        Row: {
          id: string;
          ad_id: string;
          user_id: string | null;
          event_type: "impression" | "click";
          location_lat: number | null;
          location_lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ad_id: string;
          user_id?: string | null;
          event_type: "impression" | "click";
          location_lat?: number | null;
          location_lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ad_id?: string;
          user_id?: string | null;
          event_type?: "impression" | "click";
          location_lat?: number | null;
          location_lng?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      spot_predictions: {
        Row: {
          id: string;
          predicted_lat: number;
          predicted_lng: number;
          predicted_time: string;
          neighborhood: string | null;
          sent_to_user_id: string | null;
          converted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          predicted_lat: number;
          predicted_lng: number;
          predicted_time: string;
          neighborhood?: string | null;
          sent_to_user_id?: string | null;
          converted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          predicted_lat?: number;
          predicted_lng?: number;
          predicted_time?: string;
          neighborhood?: string | null;
          sent_to_user_id?: string | null;
          converted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      invite_conversions: {
        Row: {
          id: string;
          inviter_id: string;
          invitee_phone: string | null;
          invited_via: "sms" | "share";
          converted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          inviter_id: string;
          invitee_phone?: string | null;
          invited_via?: "sms" | "share";
          converted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          inviter_id?: string;
          invitee_phone?: string | null;
          invited_via?: "sms" | "share";
          converted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_: string]: {
        Row: Record<string, unknown>;
        Relationships: unknown[];
      };
    };
    Functions: {
      deduct_match_credit: {
        Args: { p_user_id: string };
        Returns: unknown;
      };
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
      recalc_average_rating: {
        Args: { rated_user_id: string };
        Returns: unknown;
      };
      progress_quest: {
        Args: { p_user_id: string; p_action_type: string };
        Returns: unknown;
      };
      is_user_blocked: {
        Args: { check_user_id: string; by_user_id: string };
        Returns: boolean;
      };
      phone_otps: {
        Row: {
          id: string;
          user_id: string;
          phone: string;
          code: string;
          used: boolean | null;
          created_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone: string;
          code: string;
          used?: boolean | null;
          created_at?: string | null;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          phone?: string;
          code?: string;
          used?: boolean | null;
          created_at?: string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phone_otps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Enums: {
      parking_spot_status: "active" | "taken" | "expired";
      relay_mode: "imminent" | "scheduled";
      match_status: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";
      chat_status: "active" | "completed" | "expired";
      user_role: "user" | "admin";
      flag_type: "wrong_location" | "fake_spot" | "rude_user" | "dangerous_behavior" | "other";
      ad_event_type: "impression" | "click";
      invite_method: "sms" | "share";
    };
  };
}
