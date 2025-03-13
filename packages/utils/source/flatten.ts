const flat = <T>(iterable: T[], stash: T[]): T[] => {
	for (const element of iterable) {
		if (Array.isArray(element)) {
			flat(element, stash);
		} else {
			stash.push(element);
		}
	}

	return stash;
};

export const flatten = <T>(iterable: T[]): T[] => flat(iterable, []);
