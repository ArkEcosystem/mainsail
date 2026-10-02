export const chunk = <T>(iterable: T[], chunkSize: number): T[][] => {
	const iterableLength: number = iterable.length;

	if (!iterableLength || chunkSize <= 0) {
		return [];
	}

	let index = 0;
	let resIndex = 0;
	const result: T[][] = Array.from({ length: Math.ceil(iterableLength / chunkSize) });

	while (index < iterableLength) {
		result[resIndex++] = iterable.slice(index, (index += chunkSize));
	}

	return result;
};
