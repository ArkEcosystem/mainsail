import { firstMapEntry } from "./first-map-entry.js";

export const firstMapValue = <K, V>(map: Map<K, V>): V => firstMapEntry(map)[1];
