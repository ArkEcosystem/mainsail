import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Proposal implements Contracts.Crypto.Proposal {
	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	#blockHeader!: Contracts.Crypto.BlockHeader;
	#lockProof?: Contracts.Crypto.AggregatedSignature;
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
		blockHeader,
		lockProof,
		dataSerialized,
		validRound,
		signature,
		serialized,
	}: Omit<Contracts.Crypto.ProposalData, "data"> & {
		dataSerialized: string;
		serialized: Buffer;
	}): Proposal {
		this.#blockHeader = blockHeader;
		this.#lockProof = lockProof;
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

	public get blockHeader(): Contracts.Crypto.BlockHeader {
		return this.#blockHeader;
	}

	public get lockProof(): Contracts.Crypto.AggregatedSignature | undefined {
		return this.#lockProof;
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

		this.#data = await this.proposalFactory.makeProposedDataFromBytes(Buffer.from(this.#dataSerialized, "hex"));
	}

	public getData(): Contracts.Crypto.ProposedData {
		if (this.#data === undefined) {
			throw new Error("Proposed data is not deserialized.");
		}

		return this.#data;
	}

	public toString(): string {
		return JSON.stringify({
			block: this.#blockHeader.hash,
			blockNumber: this.#blockHeader.number,
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
			blockHeader: this.#blockHeader,
			data: { serialized: this.#dataSerialized },
			lockProof: this.#lockProof,
			round: this.#round,
			signature: this.#signature,
			validRound: this.#validRound,
			validatorIndex: this.#validatorIndex,
		};
	}
}
