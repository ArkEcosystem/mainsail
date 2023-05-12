import { getPathSegments } from "./get-path-segments";
import { isObject } from "./is-object";
import { isString } from "./is-string";

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
