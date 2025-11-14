import dynamic from "next/dynamic";

export default function Home() {
  const MapCanvas = dynamic(() => import("@/components/MapCanvas"), {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
        Loading map…
      </div>
    ),
  });

  return (
    <main className="flex min-h-screen flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">
          UTM Area-Preserving Polygon Editor
        </h1>
        <p className="text-sm text-slate-500">
          Draw and drag polygons anywhere on the OpenStreetMap basemap. Areas are recomputed in an appropriate UTM
          zone each time the centroid changes.
        </p>
      </header>
      <section className="relative flex-1">
        <MapCanvas />
      </section>
    </main>
  );
}
