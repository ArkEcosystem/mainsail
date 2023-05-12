import * as execaImport from "execa";
export { ExecaReturnValue, ExecaSyncReturnValue } from "execa";

export const execa = {
	...execaImport,
	run: execaImport.default,
};
