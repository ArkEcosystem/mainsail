import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Proposal implements Contracts.Crypto.Proposal {
	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.MessageFactory;

	#height!: number;
	#round!: number;
	#validRound?: number;
	#dataSerialized!: string;
	#data?: Contracts.Crypto.ProposedData;
	#validatorIndex!: number;
	#signature!: string;
	#serialized!: Buffer;

	public initialize({
		round,
		validatorIndex,
		height,
		dataSerialized,
		validRound,
		signature,
		serialized,
	}: Omit<Contracts.Crypto.ProposalData, "data"> & {
		dataSerialized: string;
		height: number;
		serialized: Buffer;
	}): Proposal {
		this.#height = height;
		this.#round = round;
		this.#validRound = validRound;
		this.#dataSerialized = dataSerialized;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
		this.#serialized = serialized;

		return this;
	}

	public get isDataDeserialized(): boolean {
		return this.#data !== undefined;
	}

	public get height(): number {
		return this.#height;
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
		if (this.#data !== undefined) {
			return;
		}

		this.#data = await this.messageFactory.makeProposedDataFromBytes(Buffer.from(this.#dataSerialized, "hex"));
	}

	public getData(): Contracts.Crypto.ProposedData {
		if (this.#data === undefined) {
			throw new Error("Proposed data is not deserialized.");
		}

		return this.#data;
	}

	public toString(): string {
		return JSON.stringify({
			block: this.#data?.block.header.id,
			height: this.#height,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	public toSerializableData(): Contracts.Crypto.SerializableProposalData {
		return {
			data: { serialized: this.#dataSerialized },
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}

	public toData(): Contracts.Crypto.ProposalData {
		return {
			data: { serialized: this.#dataSerialized },
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
