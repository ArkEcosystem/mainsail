import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.Proposal {
	#round: number;
	#validRound?: number;
	#block: Contracts.Crypto.ProposedData;
	#validatorIndex: number;
	#signature: string;
	#serialized: Buffer;

	constructor({
		round,
		validatorIndex,
		block,
		validRound,
		signature,
		serialized,
	}: Contracts.Crypto.ProposalData & { block: Contracts.Crypto.ProposedData; serialized: Buffer }) {
		this.#round = round;
		this.#validRound = validRound;
		this.#block = block;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;
	}

	get height(): number {
		return this.#block.block.header.height;
	}

	get round(): number {
		return this.#round;
	}

	get validRound(): number | undefined {
		return this.#validRound;
	}

	get block(): Contracts.Crypto.ProposedData {
		return this.#block;
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
			block: this.#block.block.header.id,
			height: this.#block.block.header.height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSerializableData(): Contracts.Crypto.SerializableProposalData {
		return {
			block: this.#block,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}

	toData(): Contracts.Crypto.ProposalData {
		return {
			block: { serialized: this.#block.serialized },
			height: this.#block.block.header.height,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
