import { filter } from "./filter.js";

export const pull = <T>(iterable: T[], ...arguments_: any[]): T[] =>
	filter(iterable, (item) => !arguments_.includes(item)) as T[];
