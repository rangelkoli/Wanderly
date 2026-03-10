import { NextRequest, NextResponse } from "next/server";

type Point = {
  lat: number;
  lng: number;
};

function parsePoints(raw: string | null) {
  if (!raw) {
    return [];
  }

  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [latRaw, lngRaw] = entry.split(",");
      const lat = Number(latRaw);
      const lng = Number(lngRaw);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return [];
      }

      return [{ lat, lng } satisfies Point];
    });
}

export async function GET(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY for Google Static Maps." },
      { status: 500 },
    );
  }

  const points = parsePoints(request.nextUrl.searchParams.get("points")).slice(0, 24);
  if (points.length === 0) {
    return NextResponse.json(
      { error: "At least one valid point is required." },
      { status: 400 },
    );
  }

  const size = request.nextUrl.searchParams.get("size") || "1200x720";
  const mapType = request.nextUrl.searchParams.get("maptype") || "roadmap";

  const googleUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  googleUrl.searchParams.set("size", size);
  googleUrl.searchParams.set("scale", "2");
  googleUrl.searchParams.set("maptype", mapType);
  googleUrl.searchParams.set("format", "png");
  googleUrl.searchParams.set("key", apiKey);

  const visible = points.map((point) => `${point.lat},${point.lng}`).join("|");
  googleUrl.searchParams.set("visible", visible);

  if (points.length > 1) {
    googleUrl.searchParams.append(
      "path",
      `color:0x1c7c7dcc|weight:5|${visible}`,
    );
  }

  points.forEach((point, index) => {
    const label = `${(index + 1) % 10}`;
    googleUrl.searchParams.append(
      "markers",
      `color:0xd66b2d|label:${label}|${point.lat},${point.lng}`,
    );
  });

  const response = await fetch(googleUrl.toString(), {
    headers: {
      Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { error: "Google Static Maps request failed.", details },
      { status: response.status },
    );
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
