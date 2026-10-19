const disallowedKeys = new Set(["__proto__", "prototype", "constructor"]);

export const getPathSegments = (value: string): string[] => {
	const segments: string[] = value.split(".");

	return segments.some((segment: string) => disallowedKeys.has(segment)) ? [] : segments;
};
