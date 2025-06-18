import { Block } from "../contracts/crypto/block.js";
import { Exception } from "./base.js";

export class ValidatorException extends Exception {}

export class BlockNotChained extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} is not chained.`);
	}
}

export class BlockNotVerified extends ValidatorException {
	public constructor(block: Block, reason: string) {
		super(`Block ${block.data.hash} is not verified, because: ${reason}.`);
	}
}

export class InvalidTimestamp extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} timestamp is too low.`);
	}
}

export class InvalidReward extends ValidatorException {
	public constructor(block: Block, expectedReward: string) {
		super(
			`Block ${block.data.hash} has invalid reward. Block reward is ${block.data.reward} instead ${expectedReward}.`,
		);
	}
}

export class InvalidBlockVersion extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} has invalid version.`);
	}
}

export class MaxTransactionsExceeded extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} has exceeded max transactions limit.`);
	}
}

export class InvalidTransactionsLength extends ValidatorException {
	public constructor(block: Block) {
		super(
			`Block ${block.data.hash} has invalid transactions length. Expected ${block.data.transactionsCount}, but got ${block.transactions.length}.`,
		);
	}
}

export class InvalidTransactionsRoot extends ValidatorException {
	public constructor(block: Block, actualTransactionRoot: string) {
		super(
			`Block ${block.data.hash} has invalid transactions root. Expected ${block.data.transactionsRoot}, but got ${actualTransactionRoot}.`,
		);
	}
}

export class DuplicatedTransaction extends ValidatorException {
	public constructor(block: Block, hash: string) {
		super(`Block ${block.data.hash} has duplicated transaction ${hash}.`);
	}
}

export class ExceededGasLimit extends ValidatorException {
	public constructor(block: Block, maxGasLimit: number) {
		super(`Block ${block.data.hash} with  gas used ${block.data.gasUsed} exceeds max gas limit of ${maxGasLimit}.`);
	}
}

export class FutureBlock extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} timestamp is from future.`);
	}
}

export class InvalidGenerator extends ValidatorException {
	public constructor(block: Block, expectedValidator: string) {
		super(
			`Block ${block.data.hash} has invalid generator. Proposer is ${block.data.proposer} instead ${expectedValidator}.`,
		);
	}
}

export class IncompatibleTransactions extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.hash} contains incompatible transaction.`);
	}
}

export class InvalidNonce extends ValidatorException {
	public constructor(block: Block, sender: string) {
		super(`Block ${block.data.hash} contains invalid nonce for sender ${sender}.`);
	}
}

export class MaxPayloadExceeded extends ValidatorException {
	public constructor(block: Block, totalSize: number, maxPayload: number) {
		super(`Block ${block.data.hash} payload is too large ${totalSize} > ${maxPayload}.`);
	}
}

export class InvalidPayloadSize extends ValidatorException {
	public constructor(block: Block, expectedSize: number, actualSize: number) {
		super(
			`Block ${block.data.hash} payload is invalid. Expected size is ${expectedSize}, but actual size is  ${actualSize}.`,
		);
	}
}
