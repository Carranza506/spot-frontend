import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** off: not requested. denied: the user refused the permission. error: no fix could be obtained. */
export type LocationState =
  | { status: 'off' }
  | { status: 'locating' }
  | { status: 'on'; coords: Coordinates }
  | { status: 'denied' }
  | { status: 'error' };

/**
 * The device's position, only on demand: "Cerca de mí" asks for the permission the first time it's
 * turned on, and a balanced (not GPS-precise) fix is enough to search nearby businesses.
 */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: 'off' });

  const enable = useCallback(async () => {
    setState({ status: 'locating' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState({ status: 'denied' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({
        status: 'on',
        coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  const disable = useCallback(() => setState({ status: 'off' }), []);

  return { location: state, enable, disable };
}
