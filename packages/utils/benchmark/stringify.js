import { stringify } from "../distribution/stringify.js";

export const native = () => JSON.stringify([1, 2, 3]);
export const utils = () => stringify([1, 2, 3]);
