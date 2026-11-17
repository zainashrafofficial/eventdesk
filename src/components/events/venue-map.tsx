import { ExternalLink, MapPin } from "lucide-react";

/** OpenStreetMap embed (no key needed) with links out to OSM and Google Maps. */
export function VenueMap({ latitude, longitude, name }: { latitude: number; longitude: number; name: string | null }) {
  const dLon = 0.02;
  const dLat = 0.012;
  const bbox = [longitude - dLon, latitude - dLat, longitude + dLon, latitude + dLat].map((n) => n.toFixed(5)).join(",");
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const osm = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=14/${latitude}/${longitude}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <section aria-labelledby="map-title" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id="map-title" className="text-[15px] font-semibold text-ink">
            Venue map
          </h2>
          <p className="flex items-center gap-1.5 truncate text-[13px] text-muted">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{name ?? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`}</span>
          </p>
        </div>
      </div>
      <iframe
        title={`Map of ${name ?? "the venue"}`}
        src={embed}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="block h-64 w-full border-0 bg-surface-2"
      />
      <div className="flex flex-wrap gap-4 px-5 py-3 text-[13px]">
        <a href={osm} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
          OpenStreetMap <ExternalLink className="size-3.5" />
        </a>
        <a href={google} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
          Directions in Google Maps <ExternalLink className="size-3.5" />
        </a>
      </div>
    </section>
  );
}
