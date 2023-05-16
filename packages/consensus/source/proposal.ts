import { Contracts } from "@mainsail/contracts";

export class Proposal {
	#height: number;
	#round: number;
	#block: Contracts.Crypto.IBlock;
	#validatorPublicKey: string;
	#signature: string;

	constructor(
		height: number,
		round: number,
		block: Contracts.Crypto.IBlock,
		validatorPublicKey: string,
		signature: string,
	) {
		this.#height = height;
		this.#round = round;
		this.#block = block;
		this.#validatorPublicKey = validatorPublicKey;
		this.#signature = signature;
	}

	toString(): string {
		return JSON.stringify({
			block: this.#block.data.id,
			height: this.#height,
			round: this.#round,
			validatorPublicKey: this.#validatorPublicKey,
		});
	}

	toData(): {
		height: number;
		round: number;
		block: Contracts.Crypto.IBlock;
		validatorPublicKey: string;
		signature: string;
	} {
		return {
			block: this.#block,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
