import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";

@injectable()
export class MessageFactory implements Contracts.Crypto.IMessageFactory {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Message.Deserializer)
	private readonly deserializer!: Contracts.Crypto.IMessageDeserializer;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.IValidator;

	public async makeProposal(
		data: Contracts.Crypto.IMakeProposalData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IProposal> {
		this.#applySchema("proposal", data);

		const bytes = await this.serializer.serializeProposalForSignature({
			blockId: data.block.block.header.id,
			height: data.height,
			round: data.round,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Proposal(data.height, data.round, data.block, data.validRound, data.validatorIndex, signature);
	}

	public async makeProposalFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IProposal> {
		const data = await this.deserializer.deserializeProposal(bytes);
		this.#applySchema("proposal", data);

		const block = await this.blockFactory.fromProposedBytes(Buffer.from(data.block.serialized, "hex"));
		return new Proposal(data.height, data.round, block, data.validRound, data.validatorIndex, data.signature);
	}

	public async makePrevote(
		data: Contracts.Crypto.IMakePrevoteData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrevote> {
		this.#applySchema("prevote", data);

		const bytes = await this.serializer.serializePrevoteForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Prevote(data.height, data.round, data.blockId, data.validatorIndex, signature);
	}

	public async makePrevoteFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrevote(bytes);
		this.#applySchema("prevote", data);
		return new Prevote(data.height, data.round, data.blockId, data.validatorIndex, data.signature);
	}

	public async makePrecommit(
		data: Contracts.Crypto.IMakePrecommitData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrecommit> {
		this.#applySchema("precommit", data);

		const bytes = await this.serializer.serializePrecommitForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Precommit(data.height, data.round, data.blockId, data.validatorIndex, signature);
	}

	public async makePrecommitFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrecommit(bytes);
		this.#applySchema("precommit", data);
		return new Precommit(data.height, data.round, data.blockId, data.validatorIndex, data.signature);
	}

	#applySchema<T>(schema: string, data: T): T {
		const result = this.validator.validate(schema, data);

		if (!result.error) {
			return result.value;
		}

		throw new Exceptions.MessageSchemaError(schema, result.error);
	}
}
