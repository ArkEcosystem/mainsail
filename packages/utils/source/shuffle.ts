export const shuffle = <T>(iterable: T[]): T[] => {
	for (let index = iterable.length - 1; index > 0; index--) {
		const rand: number = Math.floor(Math.random() * (index + 1));
		const value: T = iterable[index];

		iterable[index] = iterable[rand];
		iterable[rand] = value;
	}

	return iterable;
};
