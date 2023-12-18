import { Contracts } from "@mainsail/contracts";

export class Prevote implements Contracts.Crypto.Prevote {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#validatorIndex: number;
	#signature: string;
	#serialized: Buffer;

	constructor({
		height,
		round,
		blockId,
		validatorIndex,
		signature,
		serialized,
	}: Contracts.Crypto.PrevoteData & { serialized: Buffer }) {
		this.#height = height;
		this.#round = round;
		this.#blockId = blockId;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;
	}

	get type(): Contracts.Crypto.MessageType {
		return Contracts.Crypto.MessageType.Prevote;
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get blockId(): string | undefined {
		return this.#blockId;
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
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSignatureData(): Contracts.Crypto.SignaturePrevoteData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			type: this.type,
		};
	}

	toData(): Contracts.Crypto.PrevoteData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			type: this.type,
			validatorIndex: this.#validatorIndex,
		};
	}
}
