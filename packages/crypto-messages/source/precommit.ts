import { Contracts } from "@mainsail/contracts";

export class Precommit implements Contracts.Crypto.Precommit {
	#blockNumber: number;
	#round: number;
	#blockHash: string | undefined;
	#validatorIndex: number;
	#signature: string;
	#serialized: Buffer;

	constructor({
		blockNumber,
		round,
		blockHash,
		validatorIndex,
		signature,
		serialized,
	}: Contracts.Crypto.PrecommitData & { serialized: Buffer }) {
		this.#blockNumber = blockNumber;
		this.#round = round;
		this.#blockHash = blockHash;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;
	}

	get type(): Contracts.Crypto.MessageType {
		return Contracts.Crypto.MessageType.Precommit;
	}

	get blockNumber(): number {
		return this.#blockNumber;
	}

	get round(): number {
		return this.#round;
	}

	get blockHash(): string | undefined {
		return this.#blockHash;
	}

	get validatorIndex(): number {
		return this.#validatorIndex;
	}

	get signature(): string {
		return this.#signature;
	}

	get serialized(): Buffer {
		return this.#serialized;
	}

	toString(): string {
		return JSON.stringify({
			blockHash: this.#blockHash,
			blockNumber: this.#blockNumber,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSignatureData(): Contracts.Crypto.SignaturePrecommitData {
		return {
			blockHash: this.#blockHash,
			blockNumber: this.#blockNumber,
			round: this.#round,
			type: this.type,
		};
	}

	toData(): Contracts.Crypto.PrecommitData {
		return {
			blockHash: this.#blockHash,
			blockNumber: this.#blockNumber,
			round: this.#round,
			signature: this.#signature,
			type: this.type,
			validatorIndex: this.#validatorIndex,
		};
	}
}
