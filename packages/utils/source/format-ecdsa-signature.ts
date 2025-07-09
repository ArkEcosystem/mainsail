export const formatEcdsaSignature = (r: string, s: string, v: number): string => {
	return `${r}${s}${v.toString(16).padStart(2, "0")}`;
};
