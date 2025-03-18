import { truncate } from "../distribution/truncate.js";
import lodashTruncate from "lodash/truncate.js";

export const utils = () =>
	truncate("Hello World", {
		length: 5,
	});
export const lodash = () =>
	lodashTruncate("Hello World", {
		length: 5,
	});
