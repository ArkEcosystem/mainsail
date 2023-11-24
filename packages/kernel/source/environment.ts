export const getBoolean = <T extends boolean | undefined>(
	name: string,
	defaultValue?: T,
): T extends undefined ? boolean | undefined : boolean => {
	if (["true", "false", undefined].includes(process.env[name])) {
		return process.env[name] === "true";
	}

	return defaultValue as T extends undefined ? undefined : boolean;
};

export const get = <T extends string | number | undefined>(
	name: string,
	defaultValue?: T,
): T extends undefined ? string | undefined : T extends number ? string | number : string => {
	if (process.env[name] !== undefined) {
		return process.env[name] as T extends undefined ? string | undefined : string;
	}

	return defaultValue as T extends undefined ? string | undefined : T extends number ? string | number : string;
};
