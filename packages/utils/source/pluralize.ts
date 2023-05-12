export const pluralize = (value: string, count = 1, inclusive = false): string => {
	let output: string = value;

	if (count !== 1) {
		output += "s";
	}

	return inclusive ? `${count} ${output}` : output;
};
