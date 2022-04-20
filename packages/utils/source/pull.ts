import { filter } from "./filter";

export const pull = <T>(iterable: T[], ...arguments_: any[]): T[] =>
	filter(iterable, (item) => !arguments_.includes(item)) as T[];
