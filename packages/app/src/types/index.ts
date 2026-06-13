export interface WeatherData {
  condition: string;
  air_temp: number;
  track_temp: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
}

export interface SessionData {
  event_name: string;
  session_id: number;
  elapsed_time: string;
  elapsed_seconds: number;
  remaining_seconds: number;
  flag_state: string;
  safety_car: boolean;
  start_time: number;
  duration: number;
  weather: WeatherData;
}

export interface DriverInfo {
  firstName: string;
  lastName: string;
  country: string;
  license: string;
  shortName: string;
}

export interface CarEntry {
  ranking: number;
  number: string;
  id: number;
  category: string;
  team: string;
  driver: string;
  car: string;
  lap: number;
  gap: string;
  gapLaps: string;
  gapPrev: string;
  gapPrevLaps: string;
  classGap: string;
  classGapLaps: string;
  classGapPrev: string;
  lastlap: string;
  pitstop: number;
  bestLap: string;
  speed: string;
  bestSector1: string;
  bestSector2: string;
  bestSector3: string;
  currentSector1: string;
  currentSector2: string;
  currentSector3: string;
  sector: number;
  categoryPosition: number;
  state: string;
  nationality: string;
  tyre: string;
  positionChange: number;
  categoryPositionChange: number;
  secondBestLap: string;
  drivers: DriverInfo[];
}

export interface ApiCurrent {
  live: boolean;
  updated_at: string;
  poll: number;
  session: SessionData;
  entries: CarEntry[];
}

export interface ApiEntries {
  count: number;
  categories: string[];
  entries: CarEntry[];
}
