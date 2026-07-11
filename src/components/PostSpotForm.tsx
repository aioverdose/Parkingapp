"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X, ShieldX, RefreshCw, Info, Car, Calendar, Clock } from "lucide-react";
import { createSpot } from "@/lib/api-client";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

interface PostSpotFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type LocationState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

function getBrowserHelpText(): { title: string; steps: string[] } {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg")) {
    return {
      title: "Microsoft Edge",
      steps: [
        'Click the lock icon in the address bar',
        'Find "Location" in the list',
        'Change it to "Allow"',
        'Reload the page and try again',
      ],
    };
  }
  if (ua.includes("chrome")) {
    return {
      title: "Google Chrome",
      steps: [
        'Click the lock icon in the address bar',
        'Go to "Site settings"',
        'Change "Location" to "Allow"',
        'Reload the page and try again',
      ],
    };
  }
  if (ua.includes("firefox")) {
    return {
      title: "Firefox",
      steps: [
        'Click the lock icon in the address bar',
        'Go to "Connection settings"',
        'Change "Location" to "Allow"',
        'Reload the page and try again',
      ],
    };
  }
  if (ua.includes("safari")) {
    return {
      title: "Safari",
      steps: [
        'Go to Safari > Settings for This Website',
        'Find "Location"',
        'Select "Allow"',
        'Reload the page and try again',
      ],
    };
  }
  return {
    title: "Your browser",
    steps: [
      'Open browser settings / site permissions',
      'Find the location permission for this site',
      'Set it to "Allow"',
      'Reload the page and try again',
    ],
  };
}

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function PostSpotForm({ onClose, onSuccess }: PostSpotFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [vehicleType, setVehicleType] = useState("any");
  const [departureTime, setDepartureTime] = useState("");
  const [returnTime, setReturnTime] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationState("requesting");
    setError(null);

    let bestCoords: { lat: number; lng: number; accuracy: number } | null = null;

    const finish = (coords: { lat: number; lng: number }) => {
      setCoords({ lat: coords.lat, lng: coords.lng });
      setLocationState("granted");

      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`
      )
        .then((res) => res.json())
        .then((data) => {
          const street = data.address.road || data.address.pedestrian || "";
          const houseNumber = data.address.house_number || "";
          setAddress(street ? `${houseNumber} ${street}`.trim() : data.display_name.split(",")[0]);
        })
        .catch(() => {
          setAddress("Nearby your location");
        });
    };

    const timeout = setTimeout(() => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (bestCoords) {
        finish(bestCoords);
      } else {
        setLocationState("idle");
        setError("Location request timed out. Please try again.");
      }
    }, 10000);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        bestCoords = { lat: latitude, lng: longitude, accuracy };

        if (accuracy <= 50) {
          clearTimeout(timeout);
          navigator.geolocation.clearWatch(watchId);
          finish(bestCoords);
        }
      },
      (err) => {
        clearTimeout(timeout);
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationState("denied");
          setError("Location access was blocked.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          if (bestCoords) {
            finish(bestCoords);
          } else {
            setLocationState("unavailable");
            setError("Location data is unavailable. Check your device settings.");
          }
        } else if (err.code === err.TIMEOUT) {
          if (bestCoords) {
            finish(bestCoords);
          } else {
            setLocationState("idle");
            setError("Location request timed out. Please try again.");
          }
        } else {
          if (bestCoords) {
            finish(bestCoords);
          } else {
            setLocationState("unavailable");
            setError("Could not get your location.");
          }
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!coords) throw new Error("Location not found. Please try again.");
      if (!departureTime) throw new Error("Please set your departure time.");
      if (!returnTime) throw new Error("Please set your return time.");

      const departDate = new Date(departureTime);
      const returnDate = new Date(returnTime);

      if (departDate.getTime() <= Date.now()) {
        throw new Error("Departure time must be in the future.");
      }

      if (returnDate.getTime() <= departDate.getTime()) {
        throw new Error("Return time must be after departure time.");
      }

      const { error } = await createSpot({
        latitude: coords.lat,
        longitude: coords.lng,
        address: address || "Current Location",
        departure_time: departDate.toISOString(),
        return_time: returnDate.toISOString(),
        vehicle_type: vehicleType === "any" ? null : vehicleType,
      });

      if (error) throw new Error(error);

      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to post spot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (locationState === "denied") {
    const browserHelp = getBrowserHelpText();
    return (
      <div className="flex flex-col gap-6 p-8 text-center">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
            <X size={24} />
          </button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-500">
          <ShieldX size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Location Blocked</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            You blocked location access. To allow it:
          </p>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 text-left">
          <p className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
            <Info size={12} /> {browserHelp.title}
          </p>
          <ol className="space-y-1.5">
            {browserHelp.steps.map((step, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                <span className="text-blue-600 font-bold shrink-0 w-4">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <Button onClick={requestLocation} className="h-14 text-lg font-bold">
          <RefreshCw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
      </div>
    );
  }

  if (locationState !== "granted") {
    return (
      <div className="flex flex-col gap-6 p-8 text-center">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
            <X size={24} />
          </button>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
          <MapPin size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Location Access Required</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            To list your parking spot, we need to know where it is.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <Button
          onClick={requestLocation}
          disabled={locationState === "requesting"}
          className="h-14 text-lg font-bold"
        >
          {locationState === "requesting" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Waiting...
            </>
          ) : locationState === "unavailable" ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Try Again
            </>
          ) : (
            "Allow Location Access"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">List Your Parking Spot</h2>
          <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
            <MapPin size={12} /> {address || "Detecting address..."}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
          <X size={24} />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
          Set when you&apos;ll depart and return. The system will match you with compatible drivers.
        </p>

        <div className="space-y-1.5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Calendar size={14} /> Departure time
          </p>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              min={toLocalDatetimeString(new Date())}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Calendar size={14} /> Return time
          </p>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="datetime-local"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              min={departureTime || toLocalDatetimeString(new Date())}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
          <p className="font-bold">How matching works</p>
          <p>
            Once listed, our system will match you with drivers looking for a spot in your area
            during your available window. Both parties must confirm the match.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Car size={14} /> Vehicle type
          </p>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none text-sm"
          >
            <option value="any">Any vehicle</option>
            {VEHICLE_TYPES.map((vt) => (
              <option key={vt.value} value={vt.value}>{vt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-14 text-lg font-bold mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Listing...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-5 w-5" />
              List My Spot
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
