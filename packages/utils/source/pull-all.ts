import { pull } from "./pull.js";

export const pullAll = <T>(iterable: T[], values: T[]): T[] => pull(iterable, ...values);
