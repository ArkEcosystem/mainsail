export const pluck = <T>(input: T[], field: string): T[] => {
	const plucked: T[] = [];

	let count = 0;

	for (const value of input) {
		if (value != undefined && value[field] !== undefined) {
			plucked[count++] = value[field];
		}
	}

	return plucked;
};
