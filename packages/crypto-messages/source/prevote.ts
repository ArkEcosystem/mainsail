import { Contracts } from "@mainsail/contracts";

export class Prevote implements Contracts.Crypto.IPrevote {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#validatorIndex: number;
	#signature: string;

	constructor(height: number, round: number, blockId: string | undefined, validatorIndex: number, signature: string) {
		this.#height = height;
		this.#round = round;
		this.#blockId = blockId;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
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

	toString(): string {
		return JSON.stringify({
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
		});
	}

	toData(): Contracts.Crypto.IPrevoteData {
		return {
			type: this.type,
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
		};
	}
}
