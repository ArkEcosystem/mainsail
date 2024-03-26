import { execaNode, execaSync } from "execa";
export type { ExecaReturnValue, ExecaSyncReturnValue } from "execa";

export const execa = {
	run: execaNode,
	sync: execaSync,
};
