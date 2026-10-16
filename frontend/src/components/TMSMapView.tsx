'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { Coordinates } from '@/lib/distance';

interface TMSMapViewProps {
  originCoords: Coordinates | null;
  destinationCoords: Coordinates | null;
  routeCoordinates: Coordinates[];
}

const defaultCenter: Coordinates = [39.8283, -98.5795];
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FitRoute({ coordinates }: { coordinates: Coordinates[] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [32, 32] });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 6);
    } else {
      map.setView(defaultCenter, 4);
    }
  }, [coordinates, map]);

  return null;
}

export default function TMSMapView({
  originCoords,
  destinationCoords,
  routeCoordinates,
}: TMSMapViewProps) {
  const visibleCoordinates =
    routeCoordinates.length > 0
      ? routeCoordinates
      : [originCoords, destinationCoords].filter(
          (coordinates): coordinates is Coordinates => coordinates !== null,
        );

  return (
    <div className="h-80 overflow-hidden rounded-xl border border-gray-700">
      <MapContainer
        center={defaultCenter}
        className="h-full w-full"
        scrollWheelZoom={false}
        zoom={4}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRoute coordinates={visibleCoordinates} />
        {originCoords && (
          <Marker icon={markerIcon} position={originCoords}>
            <Popup>Origin / Pickup</Popup>
          </Marker>
        )}
        {destinationCoords && (
          <Marker icon={markerIcon} position={destinationCoords}>
            <Popup>Destination / Dropoff</Popup>
          </Marker>
        )}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: '#3b82f6', weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
