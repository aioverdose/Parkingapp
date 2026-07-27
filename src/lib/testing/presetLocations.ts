export interface PresetLocation {
  name: string;
  lat: number;
  lng: number;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  { name: "Downtown Long Beach", lat: 33.7700, lng: -118.1937 },
  { name: "Pine Ave & Broadway", lat: 33.7674, lng: -118.1934 },
  { name: "Shoreline Village", lat: 33.7602, lng: -118.1893 },
  { name: "Belmont Shore", lat: 33.7583, lng: -118.1345 },
  { name: "Long Beach Airport", lat: 33.8177, lng: -118.1516 },
  { name: "Pike Outlets", lat: 33.7667, lng: -118.1897 },
  { name: "CSULB", lat: 33.7838, lng: -118.1138 },
];
