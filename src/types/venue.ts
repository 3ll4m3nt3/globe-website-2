export type VenueImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type VenueVideo = {
  title: string;
  embedUrl: string;
  caption: string;
};

export type VenueGig = {
  date: string;
  title: string;
  note: string;
};

export type VenueCoordinates = {
  latitude: number;
  longitude: number;
};

export type Venue = {
  slug: string;
  name: string;
  city: string;
  country: string;
  summary: string;
  coordinates: VenueCoordinates;
  heroImage: VenueImage;
  gallery: VenueImage[];
  videos: VenueVideo[];
  gigs: VenueGig[];
  body: string;
};

export type VenueMapItem = Pick<
  Venue,
  "slug" | "name" | "city" | "country" | "summary" | "coordinates"
>;