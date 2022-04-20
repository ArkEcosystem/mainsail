export const lastIndexOf = <T>(subject: T[], target: T, fromIndex?: number): number => {
	const length: number = subject.length;
	let index = length - 1;

	if (fromIndex) {
		index = fromIndex;

		if (index < 0) {
			index += length;
		}
	}

	for (; index >= 0; index--) {
		if (subject[index] === target) {
			return index;
		}
	}

	return -1;
};
