export const protocols = (value: string): string[] =>
	value
		.slice(0, Math.max(0, value.indexOf("://")))
		.split("+")
		.filter(Boolean);
