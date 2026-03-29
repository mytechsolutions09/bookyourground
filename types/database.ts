export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'ground_owner' | 'super_admin';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          phone_verified: boolean;
          avatar_url: string | null;
          business_name: string | null;
          business_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          phone?: string | null;
          phone_verified?: boolean;
          avatar_url?: string | null;
          business_name?: string | null;
          business_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          phone_verified?: boolean;
          avatar_url?: string | null;
          business_name?: string | null;
          business_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      grounds: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          address: string;
          city: string;
          state: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          base_price_per_hour: number;
          pitch_type: string | null;
          ground_size: string | null;
          has_floodlights: boolean;
          has_parking: boolean;
          has_changing_rooms: boolean;
          has_pavilion: boolean;
          capacity: number | null;
          verified: boolean;
          approved: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          address: string;
          city: string;
          state: string;
          pincode: string;
          latitude?: number | null;
          longitude?: number | null;
          base_price_per_hour: number;
          pitch_type?: string | null;
          ground_size?: string | null;
          has_floodlights?: boolean;
          has_parking?: boolean;
          has_changing_rooms?: boolean;
          has_pavilion?: boolean;
          capacity?: number | null;
          verified?: boolean;
          approved?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          address?: string;
          city?: string;
          state?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          base_price_per_hour?: number;
          pitch_type?: string | null;
          ground_size?: string | null;
          has_floodlights?: boolean;
          has_parking?: boolean;
          has_changing_rooms?: boolean;
          has_pavilion?: boolean;
          capacity?: number | null;
          verified?: boolean;
          approved?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ground_images: {
        Row: {
          id: string;
          ground_id: string;
          image_url: string;
          is_primary: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          ground_id: string;
          image_url: string;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          ground_id?: string;
          image_url?: string;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
        };
      };
      time_slots: {
        Row: {
          id: string;
          ground_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          custom_price: number | null;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ground_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          custom_price?: number | null;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ground_id?: string;
          day_of_week?: DayOfWeek;
          start_time?: string;
          end_time?: string;
          custom_price?: number | null;
          is_available?: boolean;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          ground_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          price_per_hour: number;
          total_amount: number;
          status: BookingStatus;
          notes: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ground_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          price_per_hour: number;
          total_amount: number;
          status?: BookingStatus;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ground_id?: string;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          total_hours?: number;
          price_per_hour?: number;
          total_amount?: number;
          status?: BookingStatus;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          ground_id: string;
          booking_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ground_id: string;
          booking_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ground_id?: string;
          booking_id?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          amount: number;
          status: TransactionStatus;
          payment_method: string | null;
          transaction_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          amount: number;
          status?: TransactionStatus;
          payment_method?: string | null;
          transaction_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          amount?: number;
          status?: TransactionStatus;
          payment_method?: string | null;
          transaction_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          ground_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ground_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ground_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          data?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      booking_status: BookingStatus;
      transaction_status: TransactionStatus;
      day_of_week: DayOfWeek;
    };
  };
}
