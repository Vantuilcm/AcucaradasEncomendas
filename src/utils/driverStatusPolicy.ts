type DriverStatus = 'pending' | 'active' | 'inactive' | 'blocked' | undefined | null;

function isActive(status: DriverStatus): boolean {
  return status === 'active';
}

export function canGoOnline(status: DriverStatus): boolean {
  return isActive(status);
}

export function canAcceptOrders(status: DriverStatus): boolean {
  return isActive(status);
}

export function canViewAvailableOrders(status: DriverStatus): boolean {
  return isActive(status);
}
