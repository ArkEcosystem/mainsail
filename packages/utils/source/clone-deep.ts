import { copy } from "fast-copy";

export const cloneDeep = <T>(object: T): T => copy(object);
