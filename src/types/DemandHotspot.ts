import { GeoCoordinates } from '../services/LocationService';

export interface DemandHotspot {
  id: string;
  name: string;
  center: GeoCoordinates;
  radiusMeters: number;
  demandLevel: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  message?: string;
  updatedAt: string;
}

export interface HotspotNotificationState {
  driverId: string;
  hotspotId: string;
  lastNotifiedAt: string;
}
