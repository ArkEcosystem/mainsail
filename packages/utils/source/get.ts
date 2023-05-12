import { getPathSegments } from "./get-path-segments";
import { isEnumerable } from "./is-enumerable";
import { isObject } from "./is-object";
import { isString } from "./is-string";

export const get = <T, V>(object: T, path: string | string[], defaultValue?: V): V | undefined => {
	if (!isObject(object) || !isString(path)) {
		return defaultValue;
	}

	const pathSegments: string[] = getPathSegments(path);

	for (let index = 0; index < pathSegments.length; index++) {
		if (!isEnumerable(object, pathSegments[index])) {
			return defaultValue;
		}

		object = object[pathSegments[index]];

		if (object === undefined || object === null) {
			if (index !== pathSegments.length - 1) {
				return defaultValue;
			}

			break;
		}
	}

	return object as unknown as V;
};
