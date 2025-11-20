export const isConstructor = (value: unknown): boolean =>
	typeof value === "function" && !!value.prototype && typeof value.prototype.constructor?.name === "string";
