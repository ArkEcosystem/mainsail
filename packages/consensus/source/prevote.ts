import { IPrevote, IPrevoteData } from "./types";

export class Prevote implements IPrevote {
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

	toString(): string {
		return JSON.stringify({
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
		});
	}

	toData(): IPrevoteData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
