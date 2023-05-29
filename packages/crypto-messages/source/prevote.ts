import { Contracts } from "@mainsail/contracts";

export class Prevote implements Contracts.Crypto.IPrevote {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#validatorPublicKey: string;
	#signature: string;

	constructor(
		height: number,
		round: number,
		blockId: string | undefined,
		validatorPublicKey: string,
		signature: string,
	) {
		this.#height = height;
		this.#round = round;
		this.#blockId = blockId;
		this.#validatorPublicKey = validatorPublicKey;
		this.#signature = signature;
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

	get validatorPublicKey(): string {
		return this.#validatorPublicKey;
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
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
