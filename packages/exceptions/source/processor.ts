import type { Contracts } from "@mainsail/contracts";

import { Exception } from "./base.js";

export class ValidatorException extends Exception {}

export class BlockNotChained extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block) {
		super(`Block ${block.hash} is not chained.`);
	}
}

export class InvalidTimestamp extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block) {
		super(`Block ${block.hash} timestamp is too low.`);
	}
}

export class InvalidReward extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, expectedReward: string) {
		super(`Block ${block.hash} has invalid reward. Block reward is ${block.reward} instead ${expectedReward}.`);
	}
}

export class InvalidBlockVersion extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block) {
		super(`Block ${block.hash} has invalid version.`);
	}
}

export class InvalidTransactionsLength extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block) {
		super(
			`Block ${block.hash} has invalid transactions length. Expected ${block.transactionsCount}, but got ${block.transactions.length}.`,
		);
	}
}

export class InvalidGasUsed extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, consumedGas: number) {
		super(`Block ${block.hash} has invalid gas used. Expected ${block.gasUsed}, but consumed ${consumedGas}.`);
	}
}

export class InvalidFee extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, consumedFee: bigint) {
		super(`Block ${block.hash} has invalid fee. Expected ${block.fee}, but consumed ${consumedFee}.`);
	}
}

export class InvalidStateRoot extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, actualStateRoot: string) {
		super(`Block ${block.hash} has invalid state root. Expected ${block.stateRoot}, but got ${actualStateRoot}.`);
	}
}

export class InvalidLogsBloom extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, actualLogsBloom: string) {
		super(`Block ${block.hash} has invalid logs bloom. Expected ${block.logsBloom}, but got ${actualLogsBloom}.`);
	}
}

export class InvalidTransactionsRoot extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, actualTransactionRoot: string) {
		super(
			`Block ${block.hash} has invalid transactions root. Expected ${block.transactionsRoot}, but got ${actualTransactionRoot}.`,
		);
	}
}

export class DuplicatedTransaction extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, hash: string) {
		super(`Block ${block.hash} has duplicated transaction ${hash}.`);
	}
}

export class ExceededGasLimit extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, maxGasLimit: number) {
		super(`Block ${block.hash} with  gas used ${block.gasUsed} exceeds max gas limit of ${maxGasLimit}.`);
	}
}

export class InvalidRandaoReveal extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block) {
		super(`Block ${block.hash} has an invalid randao reveal for proposer ${block.proposer}.`);
	}
}

export class InvalidGenerator extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, expectedValidator: string) {
		super(`Block ${block.hash} has invalid generator. Proposer is ${block.proposer} instead ${expectedValidator}.`);
	}
}

export class InvalidBlockRound extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, round: number) {
		super(`Block ${block.hash} has round ${block.round}, which is ahead of round ${round}.`);
	}
}

export class MaxPayloadExceeded extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, totalSize: number, maxPayload: number) {
		super(`Block ${block.hash} payload is too large ${totalSize} > ${maxPayload}.`);
	}
}

export class InvalidPayloadSize extends ValidatorException {
	public constructor(block: Contracts.Crypto.Block, expectedSize: number, actualSize: number) {
		super(
			`Block ${block.hash} payload is invalid. Expected size is ${expectedSize}, but actual size is  ${actualSize}.`,
		);
	}
}
