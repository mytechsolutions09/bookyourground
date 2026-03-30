import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Ground = Database['public']['Tables']['grounds']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type GroundType = Database['public']['Tables']['ground_types']['Row'];
export type GroundImage = Database['public']['Tables']['ground_images']['Row'];
export type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type GroundWithImages = Ground & {
  ground_images: GroundImage[];
  reviews?: Review[];
  owner?: Profile;
};

export type BookingWithDetails = Booking & {
  ground: Ground & {
    ground_images: GroundImage[];
  };
  user?: Profile;
};

export type { UserRole, BookingStatus, TransactionStatus, DayOfWeek } from './database';
