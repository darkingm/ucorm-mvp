import 'server-only';
import { env } from '@/lib/env';

export type GooglePlaceReview = {
  name: string;
  publishTime: string;
  rating: number;
  text?: { text: string; languageCode?: string };
  originalText?: { text: string; languageCode?: string };
  authorAttribution: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
};

export type GooglePlace = {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  reviews?: GooglePlaceReview[];
};

const FIELD_MASK = 'id,displayName,formattedAddress,reviews';

export async function fetchPlaceWithReviews(placeId: string): Promise<GooglePlace> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': env.googlePlacesApiKey(),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Places API ${res.status}: ${body.slice(0, 500)}`);
  }

  return (await res.json()) as GooglePlace;
}
