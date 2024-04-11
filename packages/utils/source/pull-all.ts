import { pull } from "./pull.js";

export const pullAll = <T>(iterable: T[], iteratees: string[]): T[] => pull(iterable, ...iteratees);
