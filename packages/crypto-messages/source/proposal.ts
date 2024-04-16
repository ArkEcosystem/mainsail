import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Proposal implements Contracts.Crypto.Proposal {
	#round!: number;
	#validRound?: number;
	#data!: Contracts.Crypto.ProposedData;
	#validatorIndex!: number;
	#signature!: string;
	#serialized!: Buffer;
	#isDataDeserialized = true;

	public initialize({
		round,
		validatorIndex,
		data,
		validRound,
		signature,
		serialized,
	}: Contracts.Crypto.ProposalData & { data: Contracts.Crypto.ProposedData; serialized: Buffer }): Proposal {
		this.#round = round;
		this.#validRound = validRound;
		this.#data = data;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;

		return this;
	}

	public get isDataDeserialized(): boolean {
		return this.#isDataDeserialized;
	}

	public get height(): number {
		return this.#data.block.header.height;
	}

	public get round(): number {
		return this.#round;
	}

	public get validRound(): number | undefined {
		return this.#validRound;
	}

	public get validatorIndex(): number {
		return this.#validatorIndex;
	}

	public get signature(): string {
		return this.#signature;
	}

	public get serialized(): Buffer {
		return this.#serialized;
	}

	public async deserializeData(): Promise<void> {}

	public getData(): Contracts.Crypto.ProposedData {
		return this.#data;
	}

	public toString(): string {
		return JSON.stringify({
			block: this.#data.block.header.id,
			height: this.#data.block.header.height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	public toSerializableData(): Contracts.Crypto.SerializableProposalData {
		return {
			data: this.#data,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}

	public toData(): Contracts.Crypto.ProposalData {
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
