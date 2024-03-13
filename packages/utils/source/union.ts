import { flatten } from "./flatten.js";
import { uniq } from "./uniq.js";

export const union = <T>(...arguments_: T[]): T[] => uniq(flatten(arguments_));
