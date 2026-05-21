import type { Contracts } from "@mainsail/contracts";

export class Message implements Contracts.Crypto.Message {
	#type: Contracts.Crypto.MessageType;
	#blockNumber: number;
	#round: number;
	#blockHash: string | undefined;
	#validatorIndex: number;
	#signature: string;
	#serialized: Buffer;

	constructor({
		blockHash,
		blockNumber,
		round,
		serialized,
		signature,
		type,
		validatorIndex,
	}: Contracts.Crypto.MessageData & { serialized: Buffer }) {
		this.#type = type;
		this.#blockNumber = blockNumber;
		this.#round = round;
		this.#blockHash = blockHash;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;
	}

	get type(): Contracts.Crypto.MessageType {
		return this.#type;
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

	toData(): Contracts.Crypto.MessageData {
		return {
			blockHash: this.#blockHash,
			blockNumber: this.#blockNumber,
			round: this.#round,
			signature: this.#signature,
			type: this.#type,
			validatorIndex: this.#validatorIndex,
		};
	}

	toString(): string {
		return JSON.stringify(this.toData());
	}
}
