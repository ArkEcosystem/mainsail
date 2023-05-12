export const min = (values: number[]): number => {
	let min = values[0];

	for (const value of values) {
		min = value < min ? value : min;
	}

	return min;
};
