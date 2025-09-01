export const percentile = (values: number[], p: number): number => {
	if (values.length === 0) {
		return 0;
	}

	values = [...values].sort((a, b) => a - b);
	return values[Math.floor((p / 100) * (values.length - 1))];
};
