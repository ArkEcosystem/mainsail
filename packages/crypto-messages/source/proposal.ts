import { Contracts } from "@mainsail/contracts";

export class Proposal implements Contracts.Crypto.Proposal {
	#round: number;
	#validRound?: number;
	#data: Contracts.Crypto.ProposedData;
	#validatorIndex: number;
	#signature: string;
	#serialized: Buffer;

	constructor({
		round,
		validatorIndex,
		data,
		validRound,
		signature,
		serialized,
	}: Contracts.Crypto.ProposalData & { data: Contracts.Crypto.ProposedData; serialized: Buffer }) {
		this.#round = round;
		this.#validRound = validRound;
		this.#data = data;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;
	}

	get height(): number {
		return this.#data.block.header.height;
	}

	get round(): number {
		return this.#round;
	}

	get validRound(): number | undefined {
		return this.#validRound;
	}

	get data(): Contracts.Crypto.ProposedData {
		return this.#data;
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
			block: this.#data.block.header.id,
			height: this.#data.block.header.height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSerializableData(): Contracts.Crypto.SerializableProposalData {
		return {
			data: this.#data,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}

	toData(): Contracts.Crypto.ProposalData {
		return {
			data: { serialized: this.#data.serialized },
			height: this.#data.block.header.height,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
