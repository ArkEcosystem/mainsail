import { map } from "../distribution/map.js";
import lodashMap from "lodash/map.js";

export const native = () => [4, 8].map((n) => n * n);
export const utils = () => map([4, 8], (n) => n * n);
export const lodash = () => lodashMap([4, 8], (n) => n * n);
