import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Proposal implements Contracts.Crypto.Proposal {
	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly proposalFactory!: Contracts.Crypto.ProposalFactory;

	#blockHeader!: Contracts.Crypto.BlockHeader;
	#lockProof?: Contracts.Crypto.AggregatedSignature;
	#round!: number;
	#validRound?: number;
	#payloadSerialized!: string;
	#payload?: Contracts.Crypto.ProposedPayload;
	#validatorIndex!: number;
	#signature!: string;
	#serialized!: Buffer;

	public initialize({
		blockHeader,
		lockProof,
		payloadSerialized,
		round,
		serialized,
		signature,
		validatorIndex,
		validRound,
	}: Contracts.Crypto.ProposalData & {
		serialized: Buffer;
	}): Proposal {
		this.#blockHeader = blockHeader;
		this.#lockProof = lockProof;
		this.#round = round;
		this.#validRound = validRound;
		this.#payloadSerialized = payloadSerialized;
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

	public get payloadSerialized(): string {
		return this.#payloadSerialized;
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

	public async deserializePayload(): Promise<void> {
		if (this.#payload !== undefined) {
			return;
		}

		this.#payload = await this.proposalFactory.makePayloadFromBytes(Buffer.from(this.#payloadSerialized, "hex"));
	}

	public getPayload(): Contracts.Crypto.ProposedPayload {
		if (this.#payload === undefined) {
			throw new Error("Proposed payload is not deserialized.");
		}

		return this.#payload;
	}

	public toString(): string {
		return JSON.stringify({
			block: this.#blockHeader.hash,
			blockNumber: this.#blockHeader.number,
			round: this.#round,
			validatorIndex: this.#validatorIndex,
			validRound: this.#validRound,
		});
	}

	public toSerializableData(): Contracts.Crypto.ProposalDataSerializable {
		return {
			payloadSerialized: this.#payloadSerialized,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
			validRound: this.#validRound,
		};
	}

	public toData(): Contracts.Crypto.ProposalData {
		return {
			blockHeader: this.#blockHeader,
			lockProof: this.#lockProof,
			payloadSerialized: this.#payloadSerialized,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
			validRound: this.#validRound,
		};
	}
}
