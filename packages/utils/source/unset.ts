import { getPathSegments } from "./get-path-segments.js";
import { isObject } from "./is-object.js";
import { isString } from "./is-string.js";

export const unset = <T>(object: T, path: string | string[]): boolean => {
	if (!isObject(object) || !isString(path)) {
		return false;
	}

	const pathSegments: string[] = getPathSegments(path);

	for (let index = 0; index < pathSegments.length; index++) {
		const pathSegment: string = pathSegments[index];

		if (index === pathSegments.length - 1) {
			delete object[pathSegment];

			return true;
		}

		object = object[pathSegment];

		if (!isObject(object)) {
			return false;
		}
	}

	return false;
};
