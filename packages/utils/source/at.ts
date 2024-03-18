import { get } from "./get.js";
import { mapObject } from "./map-object.js";

export const at = <T>(object: object, paths: string[]): T[] =>
	Object.values(mapObject(paths, (path: string) => get(object, path)));
