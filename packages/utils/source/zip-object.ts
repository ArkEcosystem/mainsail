export const zipObject = <V>(keys: string[] | number[], values: V[]): Record<string | number, V> => {
	const result: Record<string | number, V> = {};

	for (const [index, key] of keys.entries()) {
		result[key] = values[index];
	}

	return result;
};
