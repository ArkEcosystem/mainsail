import { Block } from "../contracts/crypto";
import { Exception } from "./base";

export class ValidatorException extends Exception {}

export class BlockNotChained extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.id} is not chained.`);
	}
}

export class BlockNotVerified extends ValidatorException {
	public constructor(block: Block, reason: string) {
		super(`Block ${block.data.id} is not verified, because: ${reason}.`);
	}
}

export class InvalidTimestamp extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.id} timestamp is too low.`);
	}
}

export class InvalidGenerator extends ValidatorException {
	public constructor(block: Block, expectedValidator: string) {
		super(
			`Block ${block.data.id} has invalid generator. Block generator is ${block.data.generatorPublicKey} instead ${expectedValidator}.`,
		);
	}
}

export class IncompatibleTransactions extends ValidatorException {
	public constructor(block: Block) {
		super(`Block ${block.data.id} contains incompatible transaction.`);
	}
}

export class InvalidNonce extends ValidatorException {
	public constructor(block: Block, sender: string) {
		super(`Block ${block.data.id} contains invalid nonce for sender ${sender}.`);
	}
}
