export type ReviewStatus = 'pending' | 'resolved';

export type AITone = 'standard' | 'friendly' | 'apologetic';

export type AIReplies = {
  standard: string;
  friendly: string;
  apologetic: string;
};

export type Place = {
  id: string;
  place_id: string;
  name: string | null;
  address: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  place_id: string;
  google_review_id: string | null;
  author_name: string | null;
  rating: number | null;
  comment: string | null;
  review_time: string | null;
  status: ReviewStatus;
  ai_replies: AIReplies | null;
  approved_reply: string | null;
  approved_tone: AITone | null;
  approved_at: string | null;
  created_at: string;
};

export type ReviewWithPlace = Review & {
  places: Pick<Place, 'name' | 'place_id' | 'address'> | null;
};

export type Database = {
  public: {
    Tables: {
      places: {
        Row: Place;
        Insert: {
          id?: string;
          place_id: string;
          name?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Place, 'id'>>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: {
          id?: string;
          place_id: string;
          google_review_id?: string | null;
          author_name?: string | null;
          rating?: number | null;
          comment?: string | null;
          review_time?: string | null;
          status?: ReviewStatus;
          ai_replies?: AIReplies | null;
          approved_reply?: string | null;
          approved_tone?: AITone | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Review, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'reviews_place_id_fkey';
            columns: ['place_id'];
            isOneToOne: false;
            referencedRelation: 'places';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
