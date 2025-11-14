'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';

import { polygonAreaSquareMeters, formatAreaLabel } from '@/lib/geometry';

import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

type PolygonRecord = {
  id: string;
  area: number;
};

const initialCenter: L.LatLngExpression = [40.4168, -3.7038];

const MapCanvas = () => {
  const [polygons, setPolygons] = useState<PolygonRecord[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIconRetinaUrl,
      iconUrl: markerIconUrl,
      shadowUrl: markerShadowUrl,
    });
  }, []);

  const updatePolygonArea = useCallback((layer: L.Polygon, id: string) => {
    const latLngs = layer.getLatLngs();
    const rings = normalizeLatLngs(latLngs);
    if (rings.length === 0 || rings[0].length < 3) {
      return;
    }

    const geometryRings = rings.map((ring) =>
      ring.map((coordinate) => ({
        lat: coordinate.lat,
        lng: coordinate.lng,
      })),
    );

    const area = polygonAreaSquareMeters(geometryRings);
    const formatted = formatAreaLabel(area);
    const tooltip = layer.getTooltip();
    if (tooltip) {
      tooltip.setContent(formatted);
    } else {
      layer
        .bindTooltip(formatted, {
          permanent: true,
          direction: 'center',
          className:
            'rounded bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow ring-1 ring-black/10',
        })
        .openTooltip();
    }

    setPolygons((previous) => {
      const existing = previous.find((polygon) => polygon.id === id);
      if (existing) {
        return previous.map((polygon) =>
          polygon.id === id ? { ...polygon, area } : polygon,
        );
      }
      return [...previous, { id, area }];
    });
  }, []);

  const attachLayerLifecycle = useCallback(
    (layer: L.Polygon) => {
      const id = String((layer as unknown as { _leaflet_id: number })._leaflet_id);
      layer.pm.setOptions({
        allowSelfIntersection: false,
        draggable: true,
      });
      layer.pm.enableLayerDrag();
      layer.on('pm:edit', () => updatePolygonArea(layer, id));
      layer.on('pm:dragend', () => updatePolygonArea(layer, id));
      layer.on('remove', () => {
        setPolygons((previous) => previous.filter((polygon) => polygon.id !== id));
      });

      updatePolygonArea(layer, id);
    },
    [updatePolygonArea],
  );

  const handleMapReady = useCallback(
    (map: L.Map) => {
      mapRef.current = map;
      map.pm.addControls({
        position: 'topright',
        drawCircle: false,
        drawCircleMarker: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawText: false,
        drawPolygon: true,
        dragMode: true,
        editMode: true,
        cutPolygon: false,
        rotateMode: false,
      });

      map.on('pm:create', (event: L.LeafletEvent & { layer: L.Polygon }) => {
        const { layer } = event;
        attachLayerLifecycle(layer);
      });
    },
    [attachLayerLifecycle],
  );

  useEffect(
    () => () => {
      const map = mapRef.current;
      if (!map) {
        return;
      }
      map.off();
      map.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          layer.off();
        }
      });
    },
    [],
  );

  const sortedPolygons = useMemo(
    () =>
      [...polygons].sort((a, b) => {
        if (a.area === b.area) return a.id.localeCompare(b.id);
        return b.area - a.area;
      }),
    [polygons],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={initialCenter}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapLifecycle onReady={handleMapReady} />
      </MapContainer>

      <aside className="absolute left-4 top-4 z-[1000] w-72 max-w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Polygon Areas
        </h2>
        <div className="mt-2 space-y-2">
          {sortedPolygons.length === 0 ? (
            <p className="text-sm text-slate-500">
              Draw a polygon to calculate its geodesic area.
            </p>
          ) : (
            sortedPolygons.map((polygon, index) => (
              <div
                key={polygon.id}
                className="flex items-center justify-between rounded bg-slate-50/80 px-2 py-2 text-sm text-slate-600"
              >
                <span className="font-medium">Polygon {index + 1}</span>
                <span className="tabular-nums">{formatAreaLabel(polygon.area)}</span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

const MapLifecycle = ({ onReady }: { onReady: (map: L.Map) => void }) => {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
};

export default MapCanvas;

type LeafletLatLngShape =
  | L.LatLng[]
  | L.LatLng[][]
  | L.LatLng[][][]
  | L.LatLng[][][][];

function normalizeLatLngs(latlngs: LeafletLatLngShape): L.LatLng[][] {
  if (!Array.isArray(latlngs)) {
    return [];
  }

  const flatten = (input: LeafletLatLngShape): L.LatLng[][] => {
    if (input.length === 0) {
      return [];
    }
    if (input[0] instanceof L.LatLng) {
      return [input as L.LatLng[]];
    }
    return (input as LeafletLatLngShape[])
      .flatMap((segment) => flatten(segment as LeafletLatLngShape))
      .filter((ring) => ring.length > 0);
  };

  return flatten(latlngs).map((ring) => {
    if (ring.length < 2) {
      return ring;
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      return ring.slice(0, -1);
    }
    return ring.slice();
  });
}
