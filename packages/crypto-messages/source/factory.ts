import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";

@injectable()
export class MessageFactory implements Contracts.Crypto.IMessageFactory {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	public async makeProposal(
		data: Contracts.Crypto.IMakeProposalData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IProposal> {
		const bytes = await this.serializer.serializeProposal(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Proposal(data.height, data.round, data.block, data.validRound, data.validatorIndex, signature);
	}

	public async makePrevote(
		data: Contracts.Crypto.IMakePrevoteData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrevote> {
		const bytes = await this.serializer.serializePrevote(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Prevote(data.height, data.round, data.blockId, data.validatorIndex, signature);
	}

	public async makePrecommit(
		data: Contracts.Crypto.IMakePrecommitData,
		keyPair: Contracts.Crypto.IKeyPair,
	): Promise<Contracts.Crypto.IPrecommit> {
		const bytes = await this.serializer.serializePrecommit(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Precommit(data.height, data.round, data.blockId, data.validatorIndex, signature);
	}
}
