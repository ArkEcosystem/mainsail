export const formatString = (template: string, ...values: unknown[]): string => {
	let output = template;

	for (const [index, value] of values.entries()) {
		output = output.replace(`{${index}}`, String(value));
	}

	return output;
};
