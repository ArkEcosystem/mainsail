export const isTrue = (name: string): boolean => process.env[name] === "true";

export const get = <T extends string | number | undefined>(
	name: string,
	defaultValue?: T,
): T extends undefined ? string | undefined : T extends number ? string | number : string => {
	if (process.env[name] !== undefined) {
		return process.env[name] as T extends undefined ? string | undefined : string;
	}

	return defaultValue as T extends undefined ? string | undefined : T extends number ? string | number : string;
};
