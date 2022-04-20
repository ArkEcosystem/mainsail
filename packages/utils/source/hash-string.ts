export const hashString = (value: string): number => {
	let hash = 5381;
	let remaining: number = value.length;

	while (remaining) {
		hash = (hash * 33) ^ value.codePointAt(--remaining);
	}

	return hash >>> 0;
};
