/* eslint-disable sort-keys-fix/sort-keys-fix */
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.IMessageDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	@tagged("type", "consensus")
	private readonly serializer!: Contracts.Serializer.ISerializer;

	public async deserializeProposal(serialized: Buffer): Promise<Contracts.Crypto.IProposal> {
		const proposal = {} as Contracts.Crypto.IProposal;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IProposal>(buffer, proposal, {
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorIndex: {
					type: "uint8",
				},
				block: {
					type: "hex",
				},
				signature: {
					type: "signature",
				},
			},
		});

		return proposal;
	}

	public async deserializePrecommit(serialized: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const precommit = {} as Contracts.Crypto.IPrecommit;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IPrecommit>(buffer, precommit, {
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorIndex: {
					type: "uint8",
				},
				blockId: {
					type: "blockId",
				},
				signature: {
					type: "signature",
				},
			},
		});

		return precommit;
	}

	public async deserializePrevote(serialized: Buffer): Promise<Contracts.Crypto.IPrevote> {
		const prevote = {} as Contracts.Crypto.IPrevote;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.IPrevote>(buffer, prevote, {
			schema: {
				height: {
					type: "uint32",
				},
				round: {
					type: "uint32",
				},
				validatorIndex: {
					type: "uint8",
				},
				blockId: {
					type: "blockId",
				},
				signature: {
					type: "signature",
				},
			},
		});

		return prevote;
	}
}
