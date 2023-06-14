import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.IProposal {
	#height: number;
	#round: number;
	#validRound?: number;
	#block: Contracts.Crypto.IBlock;
	#validatorIndex: number;
	#signature: string;

	constructor(
		height: number,
		round: number,
		block: Contracts.Crypto.IBlock,
		validRound: number | undefined,
		validatorIndex: number,
		signature: string,
	) {
		this.#height = height;
		this.#round = round;
		this.#validRound = validRound;
		this.#block = block;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get validRound(): number | undefined {
		return this.#validRound;
	}

	get block(): Contracts.Crypto.IBlock {
		return this.#block;
	}

	get validatorIndex(): number {
		return this.#validatorIndex;
	}

	get signature(): string {
		return this.#signature;
	}

	toString(): string {
		return JSON.stringify({
			block: this.#block.data.id,
			height: this.#height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	toData(): Contracts.Crypto.IProposalData {
		return {
			block: this.#block,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
