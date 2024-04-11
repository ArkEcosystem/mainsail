import { slice } from "./slice.js";

export const take = <T>(iterable: T[], amount = 1): T[] => slice(iterable, 0, amount);
