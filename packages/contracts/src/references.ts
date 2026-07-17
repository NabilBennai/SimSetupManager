export interface PublicGame {
  id: string;
  slug: string;
  name: string;
  supportedExtensions: string[];
}

export interface PublicCarCategory {
  id: string;
  gameId: string;
  name: string;
}

export interface PublicCar {
  id: string;
  gameId: string;
  categoryId: string | null;
  categoryName: string | null;
  slug: string;
  manufacturer: string;
  name: string;
}

export interface PublicTrack {
  id: string;
  slug: string;
  name: string;
  layout: string | null;
  countryCode: string;
}
