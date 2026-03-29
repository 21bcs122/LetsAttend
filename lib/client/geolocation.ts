/** Browser geolocation helper for check-in / check-out flows. */

export type GpsResult = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

export function getGpsFix(): Promise<GpsResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
      },
      () => {
        reject(new Error("GPS denied or unavailable. Enable location for this site."));
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  });
}
