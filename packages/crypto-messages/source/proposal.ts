import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.IProposal {
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

	get signature(): string {
		return this.#signature;
	}

	toString(): string {
		return JSON.stringify({
			block: this.#block.data.id,
			height: this.#height,
			round: this.#round,
			validatorPublicKey: this.#validatorPublicKey,
		});
	}

	toData(): Contracts.Crypto.IProposalData {
		return {
			block: this.#block,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
