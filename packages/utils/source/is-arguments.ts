import { getType } from "./get-type.js";

export const isArguments = (value: unknown): boolean => getType(value) === "[object Arguments]";
