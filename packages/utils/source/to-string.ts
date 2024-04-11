import { isNil } from "./is-nil.js";
import { isString } from "./is-string.js";

export const toString = <T>(value: T): string => {
	if (isNil(value)) {
		return "";
	}

	return isString(value) ? value : String(value);
};
