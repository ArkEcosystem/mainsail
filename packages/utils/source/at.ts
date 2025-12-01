import { get } from "./get.js";
import { mapArray } from "./map-array.js";

export const at = <T>(object: unknown, paths: string[]): T[] => mapArray(paths, (path) => get(object, path) as T);
