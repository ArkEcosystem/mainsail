export const isObject = (value: unknown): value is object => value !== null && typeof value === "object";
