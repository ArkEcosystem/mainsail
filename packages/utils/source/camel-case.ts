export const camelCase = (value: string): string =>
	/[-_.\s]/.test(value)
		? value.toLowerCase().replace(/[-_.\s]+([a-z0-9])/g, (_, c) => c.toUpperCase())
		: value.replace(/^./, (c) => c.toLowerCase());
