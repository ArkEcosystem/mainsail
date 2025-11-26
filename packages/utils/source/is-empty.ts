export const isEmpty = (value: unknown): boolean => {
	if (!value) {
		return true;
	}

	if (value instanceof Map || value instanceof Set) {
		return value.size === 0;
	}

	if (typeof value === "string" || Array.isArray(value)) {
		return value.length === 0;
	}

	if (typeof value === "object") {
		return Object.keys(value).length === 0;
	}

	return false;
};
