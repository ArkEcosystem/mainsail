import { IPrecommit, IPrecommitData } from "./types";

export class Precommit implements IPrecommit {
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

	toData(): IPrecommitData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
