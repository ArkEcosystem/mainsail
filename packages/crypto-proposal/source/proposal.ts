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
	#payload?: Contracts.Crypto.ProposedPayload;
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
		return this.#payload !== undefined;
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
		if (this.#payload !== undefined) {
			return;
		}

		this.#payload = await this.proposalFactory.makePayloadFromBytes(Buffer.from(this.#dataSerialized, "hex"));
	}

	public getPayload(): Contracts.Crypto.ProposedPayload {
		if (this.#payload === undefined) {
			throw new Error("Proposed data is not deserialized.");
		}

		return this.#payload;
	}

	public toString(): string {
		return JSON.stringify({
			block: this.#blockHeader.hash,
			blockNumber: this.#blockHeader.number,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
		});
	}

	public toSerializableData(): Contracts.Crypto.ProposalDataSerializable {
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
