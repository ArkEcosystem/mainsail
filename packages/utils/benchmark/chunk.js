import { chunk } from "../distribution/chunk.js";
import lodashChunk from "lodash/chunk.js";

export const utils = () => chunk(["a", "b", "c", "d"], 2);
export const lodash = () => lodashChunk(["a", "b", "c", "d"], 2);
