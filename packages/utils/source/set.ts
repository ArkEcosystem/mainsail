import { getPathSegments } from "./get-path-segments";
import { isObject } from "./is-object";
import { isString } from "./is-string";

export const set = <T>(object: T, path: string | string[], value: unknown): boolean => {
	if (!isObject(object) || !isString(path)) {
		return false;
	}

	const pathSegments: string[] = getPathSegments(path);

	for (let index = 0; index < pathSegments.length; index++) {
		const pathSegment: string = pathSegments[index];

		if (!isObject(object[pathSegment])) {
			object[pathSegment] = {};
		}

		if (index === pathSegments.length - 1) {
			object[pathSegment] = value;
		}

		object = object[pathSegment];
	}

	return true;
};
