export const assign = <T>(target: T, ...sources: any[]): T => {
	for (const source of sources) {
		const keys = Object.keys(source);

		for (const key of keys) {
			target[key] = source[key];
		}
	}

	return target;
};
