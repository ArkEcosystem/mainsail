import { filter } from "./filter.js";
import { FunctionReturning } from "./internal/index.js";

export const pickBy = <T>(iterable: T, iteratee: FunctionReturning): T =>
	filter(iterable as any, (value) => iteratee(value));
