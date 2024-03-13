import { getPathSegments } from "./get-path-segments.js";
import { isObject } from "./is-object.js";
import { isString } from "./is-string.js";

export const has = <T>(object: T, path: string | string[]): boolean => {
	if (!isObject(object) || !isString(path)) {
		return false;
	}

	const pathSegments: string[] = getPathSegments(path);

	for (const pathSegment of pathSegments) {
		if (!isObject(object)) {
			return false;
		}

		if (!(pathSegment in object)) {
			return false;
		}

		object = object[pathSegment];
	}

	return true;
};
