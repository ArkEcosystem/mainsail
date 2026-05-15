export const pascalCase = (value: string): string | undefined =>
	/[-_.\s]/.test(value)
		? value.toLowerCase().replace(/(?:^|[-_.\s]+)([a-z0-9])/g, (_, c) => c.toUpperCase())
		: value.replace(/^./, (c) => c.toUpperCase());
