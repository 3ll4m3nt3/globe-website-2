import { GlobeLanding } from "@/components/globe/globe-landing";
import { getVenueMapItems } from "@/lib/venues";

export default async function Home() {
  const mapItems = await getVenueMapItems();

  return (
    <GlobeLanding venues={mapItems} />
  );
}
