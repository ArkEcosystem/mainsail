type getVariable<T> = (name: string, defaultValue?: T | undefined) => T | undefined;

export const getBoolean: getVariable<boolean> = (name, defaultValue) => {
	if (["true", "false", undefined].includes(process.env[name])) {
		return process.env[name] === "true";
	}

	return defaultValue;
};

export const get: getVariable<string | number> = (name, defaultValue) => process.env[name] ?? defaultValue;
