import { execaNode, execaSync } from "execa";
export type { Result, SyncResult } from "execa";

export const execa = {
	run: execaNode,
	sync: execaSync,
};
