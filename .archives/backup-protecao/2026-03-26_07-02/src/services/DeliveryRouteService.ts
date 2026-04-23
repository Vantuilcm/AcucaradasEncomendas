export interface DeliveryPoint {
  id: string;
  address: {
    latitude: number;
    longitude: number;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  timeWindow?: {
    start: string;
    end: string;
  };
  estimatedDeliveryTime: number;
  priority: number;
  orderId: string;
}

export interface DeliveryRoute {
  driverId: string;
  deliveryPoints: DeliveryPoint[];
  optimizedOrder: string[];
  totalDistance: number;
  totalTime: number;
  startTime: string;
  estimatedEndTime: string;
}

interface DeliveryRouteConfig {
  trafficFactor: number;
  maxRouteTime: number;
  averageSpeedKmh: number;
  startTime: string;
}

class DeliveryRouteService {
  private config: DeliveryRouteConfig = {
    trafficFactor: 1.2,
    maxRouteTime: 240,
    averageSpeedKmh: 30,
    startTime: '09:00',
  };

  updateConfig(partialConfig: Partial<DeliveryRouteConfig>) {
    this.config = { ...this.config, ...partialConfig };
  }

  optimizeRoutes(
    deliveryPoints: DeliveryPoint[],
    drivers: string[],
    startLocation: { latitude: number; longitude: number }
  ): DeliveryRoute[] {
    if (drivers.length === 0 || deliveryPoints.length === 0) {
      return [];
    }

    const pointsSorted = [...deliveryPoints].sort((a, b) => a.priority - b.priority);
    const routesByDriver = drivers.map(driverId => ({
      driverId,
      deliveryPoints: [] as DeliveryPoint[],
    }));

    pointsSorted.forEach((point, index) => {
      routesByDriver[index % routesByDriver.length].deliveryPoints.push(point);
    });

    return routesByDriver.map(route => {
      const optimized = this.greedyOptimize(route.deliveryPoints, startLocation);
      const totalDistance = this.calculateTotalDistance(optimized, startLocation);
      const totalTime = this.calculateTotalTime(optimized, totalDistance);
      const startTime = this.config.startTime;
      const estimatedEndTime = this.addMinutes(startTime, totalTime);

      return {
        driverId: route.driverId,
        deliveryPoints: optimized,
        optimizedOrder: optimized.map(point => point.id),
        totalDistance,
        totalTime,
        startTime,
        estimatedEndTime,
      };
    });
  }

  private greedyOptimize(points: DeliveryPoint[], startLocation: { latitude: number; longitude: number }) {
    const remaining = [...points];
    const ordered: DeliveryPoint[] = [];
    let current = startLocation;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = this.distance(current, remaining[0].address);

      for (let i = 1; i < remaining.length; i += 1) {
        const distance = this.distance(current, remaining[i].address);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const [next] = remaining.splice(nearestIndex, 1);
      ordered.push(next);
      current = next.address;
    }

    return ordered;
  }

  private calculateTotalDistance(points: DeliveryPoint[], startLocation: { latitude: number; longitude: number }) {
    if (points.length === 0) return 0;

    let total = 0;
    let current = startLocation;

    points.forEach(point => {
      total += this.distance(current, point.address);
      current = point.address;
    });

    return Number(total.toFixed(2));
  }

  private calculateTotalTime(points: DeliveryPoint[], totalDistance: number) {
    const travelTimeMinutes =
      (totalDistance / this.config.averageSpeedKmh) * 60 * this.config.trafficFactor;
    const serviceTimeMinutes = points.reduce((sum, point) => sum + point.estimatedDeliveryTime, 0);
    const total = Math.min(travelTimeMinutes + serviceTimeMinutes, this.config.maxRouteTime);
    return Math.round(total);
  }

  private distance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private addMinutes(time: string, minutesToAdd: number) {
    const [hours, minutes] = time.split(':').map(value => Number(value));
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const resultHours = Math.floor(normalizedMinutes / 60);
    const resultMinutes = normalizedMinutes % 60;
    return `${String(resultHours).padStart(2, '0')}:${String(resultMinutes).padStart(2, '0')}`;
  }
}

export const deliveryRouteService = new DeliveryRouteService();
