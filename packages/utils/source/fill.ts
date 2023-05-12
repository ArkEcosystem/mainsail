export const fill = <T, V>(subject: T[], value: V, start?: number, end?: number): (T | V)[] => {
	if (start === undefined) {
		start = 0;
	}

	if (end === undefined) {
		end = subject.length;
	}

	const results: (T | V)[] = [...subject];

	for (let index = start; index < end; index++) {
		results[index] = value;
	}

	return results;
};
