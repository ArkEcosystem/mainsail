/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.MessageDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	public async deserializeProposal(serialized: Buffer): Promise<Contracts.Crypto.ProposalData> {
		const proposal = {} as Contracts.Crypto.Proposal;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.Proposal>(buffer, proposal, {
			schema: {
				round: {
					type: "uint32",
				},
				validRound: {
					optional: true,
					type: "uint32",
				},
				block: {
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

	public async deserializePrecommit(serialized: Buffer): Promise<Contracts.Crypto.PrecommitData> {
		const precommit = {} as Contracts.Crypto.Precommit;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.Precommit>(buffer, precommit, {
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
					optional: true,
				},
				validatorIndex: {
					type: "uint8",
				},
				signature: {
					type: "consensusSignature",
				},
			},
		});

		return precommit;
	}

	public async deserializePrevote(serialized: Buffer): Promise<Contracts.Crypto.PrevoteData> {
		const prevote = {} as Contracts.Crypto.Prevote;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.Prevote>(buffer, prevote, {
			schema: {
				type: {
					type: "uint8",
				},
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				blockId: {
					type: "blockId",
					optional: true,
				},
				validatorIndex: {
					type: "uint8",
				},
				signature: {
					type: "consensusSignature",
				},
			},
		});

		return prevote;
	}

	public async deserializeLockProof(serialized: Buffer): Promise<Contracts.Crypto.AggregatedSignature> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const commit = {} as Contracts.Crypto.AggregatedSignature;

		await this.serializer.deserialize<Contracts.Crypto.AggregatedSignature>(buffer, commit, {
			length: this.messageSerializer.lockProofSize(),
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
