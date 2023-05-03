import { IBlockData } from "../contracts/crypto";
import { Exception } from "./base";

export class TooManyTransactionsError extends Exception {
	public constructor(block: IBlockData) {
		super(
			`Received block ${block.id} at height ${block.height} contained too many transactions (${block.numberOfTransactions}).`,
		);
	}
}

export class UnchainedBlockError extends Exception {
	public constructor(lastHeight: number, nextHeight: number) {
		super(`Last received block ${nextHeight} cannot be chained to ${lastHeight}.`);
	}
}

export class PeerStatusResponseError extends Exception {
	public constructor(ip: string) {
		super(`Failed to retrieve status from peer ${ip}.`);
	}
}

export class PeerPingTimeoutError extends Exception {
	public constructor(latency: number) {
		super(`Ping timeout (${latency} ms)`);
	}
}

export class PeerVerificationFailedError extends Exception {
	public constructor() {
		super("Peer verification failed.");
	}
}

export class MissingCommonBlockError extends Exception {
	public constructor() {
		super("Couldn't find any common blocks.");
	}
}
