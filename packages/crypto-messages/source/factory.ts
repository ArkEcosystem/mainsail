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
		const bytes = await this.serializer.serializeProposalForSignature({
			blockId: data.block.block.header.id,
			height: data.height,
			round: data.round,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = await this.serializer.serializeProposal({ ...data, signature });
		return this.makeProposalFromBytes(serialized);
	}

	public async makeProposalFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IProposal> {
		const data = await this.deserializer.deserializeProposal(bytes);
		return this.makeProposalFromData(data);
	}

	public async makeProposalFromData(data: Contracts.Crypto.IProposalData): Promise<Contracts.Crypto.IProposal> {
		this.#applySchema("proposal", data);
		const block = await this.blockFactory.fromProposedBytes(Buffer.from(data.block.serialized, "hex"));

		return new Proposal({ ...data, block });
	}

	public async makePrevote(
		data: Contracts.Crypto.IMakePrevoteData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrevote> {
		const bytes = await this.serializer.serializePrevoteForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		const serialized = await this.serializer.serializePrevote({ ...data, signature });
		return this.makePrevoteFromBytes(serialized);
	}

	public async makePrevoteFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrevote(bytes);
		return this.makePrevoteFromData(data);
	}

	public async makePrevoteFromData(data: Contracts.Crypto.IPrevoteData): Promise<Contracts.Crypto.IPrevote> {
		this.#applySchema("prevote", data);
		return new Prevote(data);
	}

	public async makePrecommit(
		data: Contracts.Crypto.IMakePrecommitData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrecommit> {
		const bytes = await this.serializer.serializePrecommitForSignature({
			blockId: data.blockId,
			height: data.height,
			round: data.round,
			type: data.type,
		});
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));

		const serialized = await this.serializer.serializePrecommit({ ...data, signature });
		return this.makePrecommitFromBytes(serialized);
	}

	public async makePrecommitFromBytes(bytes: Buffer): Promise<Contracts.Crypto.IPrecommit> {
		const data = await this.deserializer.deserializePrecommit(bytes);
		this.#applySchema("precommit", data);
		return new Precommit(data);
	}

	public async makePrecommitFromData(data: Contracts.Crypto.IPrecommitData): Promise<Contracts.Crypto.IPrecommit> {
		this.#applySchema("precommit", data);
		return new Precommit(data);
	}

	#applySchema<T>(schema: string, data: T): T {
		const result = this.validator.validate(schema, data);

		if (!result.error) {
			return result.value;
		}

		throw new Exceptions.MessageSchemaError(schema, result.error);
	}
}
