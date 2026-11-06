export const percentile = (values: number[], p: number): number => {
	if (values.length === 0) {
		return 0;
	}

	const clampedP = Math.min(100, Math.max(0, p));
	const sorted = [...values].sort((a, b) => a - b);

	return sorted[Math.floor((clampedP * (sorted.length - 1)) / 100)];
};
