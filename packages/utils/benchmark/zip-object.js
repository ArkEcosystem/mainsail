import { zipObject } from "../distribution/zip-object.js";
import lodashZipObject from "lodash/zipObject.js";

export const utils = () => zipObject(["a", "b"], [1, 2]);
export const lodash = () => lodashZipObject(["a", "b"], [1, 2]);
