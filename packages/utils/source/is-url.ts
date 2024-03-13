export const isURL = (value: string): boolean => {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
};
