/* eslint-disable import/no-namespace */
/* eslint-disable unicorn/prevent-abbreviations */
import * as envPathsImport from "env-paths";
export { Paths } from "env-paths";

export const envPaths = {
	get: envPathsImport.default,
};
