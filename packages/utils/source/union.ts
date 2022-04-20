import { flatten } from "./flatten";
import { uniq } from "./uniq";

export const union = <T>(...arguments_: T[]): T[] => uniq(flatten(arguments_));
