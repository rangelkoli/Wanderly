"use client";

import { useEffect, useRef, useState } from "react";

type MapPoint = {
  id: string;
  index: number;
  name: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
};

type GoogleMapsGlobal = {
  maps: any;
};

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
  }
}

let googleMapsScriptPromise: Promise<GoogleMapsGlobal> | null = null;

function loadGoogleMapsScript(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="true"]',
    );

    const handleLoad = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps loaded without the maps object."));
      }
    };

    const handleError = () => {
      googleMapsScriptPromise = null;
      reject(new Error("Google Maps failed to load."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

function buildExternalGoogleMapsUrl(points: MapPoint[]) {
  if (points.length === 0) {
    return "https://www.google.com/maps";
  }

  const destination = `${points.at(-1)?.lat},${points.at(-1)?.lng}`;
  const origin = `${points[0].lat},${points[0].lng}`;
  const waypoints = points
    .slice(1, -1)
    .map((point) => `${point.lat},${point.lng}`)
    .join("|");

  const params = new URLSearchParams({
    api: "1",
    travelmode: "walking",
    origin,
    destination,
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function renderFallbackRoute(map: any, googleMaps: GoogleMapsGlobal, points: MapPoint[]) {
  const bounds = new googleMaps.maps.LatLngBounds();

  points.forEach((point) => {
    const position = { lat: point.lat, lng: point.lng };
    bounds.extend(position);

    new googleMaps.maps.Marker({
      map,
      position,
      label: `${point.index + 1}`,
      title: point.name,
    });
  });

  if (points.length > 1) {
    new googleMaps.maps.Polyline({
      map,
      path: points.map((point) => ({ lat: point.lat, lng: point.lng })),
      strokeColor: "#1c7c7d",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, 80);
  }
}

export function GoogleDayMap({
  dayTitle,
  fallbackImageUrl,
  points,
}: {
  dayTitle: string;
  fallbackImageUrl: string | null;
  points: MapPoint[];
}) {
  const externalMapUrl = buildExternalGoogleMapsUrl(points);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!mapRef.current || points.length === 0 || !apiKey) {
      return;
    }

    let isCancelled = false;
    const mapsApiKey = apiKey;

    async function initializeMap() {
      try {
        setLoadError(null);
        const googleMaps = await loadGoogleMapsScript(mapsApiKey);
        if (isCancelled || !mapRef.current) {
          return;
        }

        const map = new googleMaps.maps.Map(mapRef.current, {
          backgroundColor: "#ece6da",
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          mapTypeControl: false,
          mapTypeId: googleMaps.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          styles: [
            {
              elementType: "geometry",
              stylers: [{ color: "#f2ede4" }],
            },
            {
              elementType: "labels.text.fill",
              stylers: [{ color: "#6b7280" }],
            },
            {
              elementType: "labels.text.stroke",
              stylers: [{ color: "#f7f4ee" }],
            },
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "transit",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        const bounds = new googleMaps.maps.LatLngBounds();
        points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));

        if (points.length === 1) {
          map.setCenter({ lat: points[0].lat, lng: points[0].lng });
          map.setZoom(14);
          new googleMaps.maps.Marker({
            map,
            position: { lat: points[0].lat, lng: points[0].lng },
            label: "1",
            title: points[0].name,
          });
          return;
        }

        const directionsService = new googleMaps.maps.DirectionsService();
        const directionsRenderer = new googleMaps.maps.DirectionsRenderer({
          map,
          markerOptions: {
            opacity: 0.95,
          },
          polylineOptions: {
            strokeColor: "#1c7c7d",
            strokeOpacity: 0.82,
            strokeWeight: 5,
          },
          preserveViewport: false,
          suppressInfoWindows: true,
        });

        directionsService.route(
          {
            destination: {
              lat: points[points.length - 1]?.lat ?? points[0].lat,
              lng: points[points.length - 1]?.lng ?? points[0].lng,
            },
            optimizeWaypoints: false,
            origin: {
              lat: points[0].lat,
              lng: points[0].lng,
            },
            travelMode: googleMaps.maps.TravelMode.WALKING,
            waypoints: points.slice(1, -1).map((point) => ({
              location: { lat: point.lat, lng: point.lng },
              stopover: true,
            })),
          },
          (result: any, status: any) => {
            if (isCancelled) {
              return;
            }

            if (status === googleMaps.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              return;
            }

            renderFallbackRoute(map, googleMaps, points);
          },
        );

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 80);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Google Maps failed to load.",
          );
        }
      }
    }

    void initializeMap();

    return () => {
      isCancelled = true;
    };
  }, [apiKey, points]);

  const shouldShowFallback = !apiKey || loadError !== null || points.length === 0;

  return (
    <div className="relative">
      {shouldShowFallback ? (
        fallbackImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`Google map of planned stops for ${dayTitle}`}
            className="h-[420px] w-full object-cover grayscale-[0.25] sm:h-[520px]"
            loading="lazy"
            src={fallbackImageUrl}
          />
        ) : (
          <div className="flex h-[420px] w-full items-center justify-center bg-[#f8f4ed] px-6 text-center text-sm text-[#5f6b7a] sm:h-[520px]">
            {loadError ?? "Google Maps preview is unavailable for this route."}
          </div>
        )
      ) : (
        <div className="relative h-[420px] w-full sm:h-[520px]">
          <div className="absolute inset-0" ref={mapRef} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02)_18%,rgba(31,41,55,0.08))]" />
      <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1c7c7d] shadow-sm">
        Google Maps
      </div>
      <a
        className="absolute bottom-4 right-4 rounded-full bg-[#1f2937] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm transition-colors hover:bg-[#111827]"
        href={externalMapUrl}
        rel="noreferrer"
        target="_blank"
      >
        Open in Maps
      </a>
    </div>
  );
}
