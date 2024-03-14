import { execaNode, execaSync } from "execa";
export { ExecaReturnValue, ExecaSyncReturnValue } from "execa";

export const execa = {
	run: execaNode,
	sync: execaSync,
};
