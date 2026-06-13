export interface Params {
  sessionName?: string;
  sessionId?: number;
  elapsedTime?: number;
  remaining?: number;
  raceState?: string;
  safetyCar?: string;
  startTime?: number;
  duration?: number;
  weather?: string;
  airTemp?: number;
  trackTemp?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windDirection?: number;
  [key: string]: unknown;
}

export interface RawEntry {
  id: number;
  number: string;
  ranking: number;
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
  driverId: number;
  drivers?: Array<{
    firstName: string;
    lastName: string;
    country: string;
    license: string;
    shortName: string;
    driverId: number;
    number: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface RawData {
  params: Params;
  entries: RawEntry[];
}
