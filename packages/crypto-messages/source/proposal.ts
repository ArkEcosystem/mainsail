import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.IProposal {
	#height: number;
	#round: number;
	#validRound: number;
	#block: Contracts.Crypto.IBlock;
	#validatorPublicKey: string;
	#signature: string;

	constructor(
		height: number,
		round: number,
		validRound: number,
		block: Contracts.Crypto.IBlock,
		validatorPublicKey: string,
		signature: string,
	) {
		this.#height = height;
		this.#round = round;
		this.#validRound = validRound;
		this.#block = block;
		this.#validatorPublicKey = validatorPublicKey;
		this.#signature = signature;
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validRound(): number {
		return this.#validRound;
	}

	get block(): Contracts.Crypto.IBlock {
		return this.#block;
	}

	get validatorPublicKey(): string {
		return this.#validatorPublicKey;
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
			validRound: this.#validRound,
			validatorPublicKey: this.#validatorPublicKey,
		};
	}
}
