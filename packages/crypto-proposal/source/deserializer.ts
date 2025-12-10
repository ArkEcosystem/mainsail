/* eslint-disable sort-keys-fix/sort-keys-fix */
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.ProposalDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	public async deserializeProposal(serialized: Buffer): Promise<Contracts.Crypto.ProposalData> {
		const proposal = {} as Contracts.Crypto.ProposalData;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.ProposalData>(buffer, proposal, {
			schema: {
				round: {
					type: "uint32",
				},
				validRound: {
					optional: true,
					type: "uint32",
				},
				data: {
					type: "hex",
				},
				validatorIndex: {
					type: "uint8",
				},
				signature: {
					type: "consensusSignature",
				},
			},
		});

		return proposal;
	}

	public async deserializeLockProof(serialized: Buffer): Promise<Contracts.Crypto.AggregatedSignature> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const commit = {} as Contracts.Crypto.AggregatedSignature;

		await this.serializer.deserialize<Contracts.Crypto.AggregatedSignature>(buffer, commit, {
			length: this.proposalSerializer.lockProofSize(),
			schema: {
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});

		return commit;
	}
}
