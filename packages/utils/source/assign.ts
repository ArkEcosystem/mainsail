export const assign = <T, S extends object[]>(target: T, ...sources: S): T & S[number] => {
	for (const source of sources) {
		for (const key of Object.keys(source) as (keyof typeof source)[]) {
			target[key] = source[key];
		}
	}

	return target as T & S[number];
};
