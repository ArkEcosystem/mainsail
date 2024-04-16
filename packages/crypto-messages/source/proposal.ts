import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Proposal implements Contracts.Crypto.Proposal {
	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	#round!: number;
	#validRound?: number;
	#dataSerialized!: string;
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
		this.#dataSerialized = data.serialized;
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

	public async deserializeData(): Promise<void> {
		if (this.#isDataDeserialized) {
			return;
		}

		this.#data = await this.messageFactory.makeProposedDataFromBytes(Buffer.from(this.#dataSerialized, "hex"));
		this.#isDataDeserialized = true;
	}

	public getData(): Contracts.Crypto.ProposedData {
		if (!this.#isDataDeserialized) {
			throw new Error("Proposed data is not deserialized.");
		}

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
