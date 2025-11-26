import { filter } from "./filter.js";

export const pull = <T>(iterable: T[], ...arguments_: T[]): T[] =>
	filter(iterable, (item) => !arguments_.includes(item)) as T[];
