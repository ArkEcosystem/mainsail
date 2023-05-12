export const numberToHex = (number_: number, padding = 2): string => {
	const indexHex: string = Number(number_).toString(16);

	return "0".repeat(padding - indexHex.length) + indexHex;
};
