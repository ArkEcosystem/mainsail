import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.IProposal {
	#height: number;
	#round: number;
	#validRound?: number;
	#block: Contracts.Crypto.IProposedBlock;
	#validatorIndex: number;
	#signature: string;

	constructor({ height, round, validatorIndex, block, validRound, signature }: Contracts.Crypto.IProposalData & { block: Contracts.Crypto.IProposedBlock }) {
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

	get block(): Contracts.Crypto.IProposedBlock {
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
			block: this.#block.block.header.id,
			height: this.#height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSignatureData(): Contracts.Crypto.ISignatureProposalData {
		return {
			blockId: this.#block.block.header.id,
			height: this.#height,
			round: this.#round,
		};
	}

	toData(): Contracts.Crypto.IProposalData {
		return {
			block: { serialized: this.#block.serialized },
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
