export const cloneArray = <T>(input: T[]): T[] => {
	const sliced = new Array(input.length);

	for (const [index, element] of input.entries()) {
		sliced[index] = element;
	}

	return sliced;
};
