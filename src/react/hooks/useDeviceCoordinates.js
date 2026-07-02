import {useCallback, useState} from 'react';
import {Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

const ANDROID_LOCATION_TIMEOUT_MS = 12000;

const normalizeCoordinate = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const requestDeviceCoordinates = async () => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position =>
          resolve({
            latitude: normalizeCoordinate(position?.coords?.latitude),
            longitude: normalizeCoordinate(position?.coords?.longitude),
          }),
        error => reject(error),
        {
          enableHighAccuracy: true,
          maximumAge: 60 * 1000,
          timeout: ANDROID_LOCATION_TIMEOUT_MS,
        },
      );
    });
  }

  const Location = require('expo-location');
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission?.status !== 'granted') {
    throw new Error('location-denied');
  }

  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {}
  }

  const currentPosition = await Location.getCurrentPositionAsync(
    Platform.OS === 'android'
      ? {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 0,
          mayShowUserSettingsDialog: true,
          timeInterval: 1000,
        }
      : {
          accuracy: Location.Accuracy.Balanced,
        },
  );

  return {
    latitude: normalizeCoordinate(currentPosition?.coords?.latitude),
    longitude: normalizeCoordinate(currentPosition?.coords?.longitude),
  };
};

export default function useDeviceCoordinates(enabled = true) {
  const [coordinates, setCoordinates] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setCoordinates(null);
        return undefined;
      }

      let isMounted = true;

      requestDeviceCoordinates()
        .then(coords => {
          if (!isMounted) {
            return;
          }

          if (
            Number.isFinite(coords?.latitude) &&
            Number.isFinite(coords?.longitude)
          ) {
            setCoordinates(coords);
          } else {
            setCoordinates(null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCoordinates(null);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [enabled]),
  );

  return coordinates;
}
