import * as Blocks from "./blocks";
import * as Peer from "./peer";
import * as Transactions from "./transactions";

export const Codecs = {
	...Blocks,
	...Peer,
	...Transactions,
};
