export const cloneArray = <T>(input: T[]): T[] => {
	const sliced = Array.from<T>({ length: input.length });

	for (const [index, element] of input.entries()) {
		sliced[index] = element;
	}

	return sliced;
};
