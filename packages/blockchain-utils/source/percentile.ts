export const percentile = (values: number[], p: number): number => {
	if (values.length === 0) {
		return 0;
	}

	const clampedP = Math.min(100, Math.max(0, p));

	values = [...values].sort((a, b) => a - b);
	return values[Math.floor((clampedP / 100) * (values.length - 1))];
};
