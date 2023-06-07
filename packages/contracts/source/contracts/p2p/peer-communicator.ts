import { IBlock, IBlockData } from "../crypto";
import { Peer } from "./peer";

export interface PeerCommunicator {
	initialize();

	postBlock(peer: Peer, block: IBlock);
	postTransactions(peer: Peer, transactions: Buffer[]): Promise<any>;
	postProposal(peer: Peer, proposal: Buffer): Promise<any>;
	postPrevote(peer: Peer, prevote: Buffer): Promise<any>;
	postPrecommit(peer: Peer, prevote: Buffer): Promise<any>;

	ping(peer: Peer, timeoutMsec: number, force?: boolean): Promise<any>;

	pingPorts(peer: Peer): Promise<void>;

	getPeers(peer: Peer): Promise<any>;

	hasCommonBlocks(peer: Peer, ids: string[], timeoutMsec?: number): Promise<any>;

	getPeerBlocks(
		peer: Peer,
		{
			fromBlockHeight,
			blockLimit,
			headersOnly,
		}: { fromBlockHeight: number; blockLimit?: number; headersOnly?: boolean },
	): Promise<IBlockData[]>;
}
