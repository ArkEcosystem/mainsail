import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";
import {
	IMakePrecommitData,
	IMakePrevoteData,
	IMakeProposalData,
	IMessageFactory,
	IPrecommit,
	IPrevote,
	IProposal,
	ISerializer,
} from "./types";

@injectable()
export class MessageFactory implements IMessageFactory {
	@inject(Identifiers.Consensus.Serializer)
	private readonly serializer: ISerializer;

	@inject(Identifiers.Consensus.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	public async makeProposal(data: IMakeProposalData, keyPair: Contracts.Crypto.IKeyPair): Promise<IProposal> {
		const bytes = await this.serializer.serializeProposal(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Proposal(data.height, data.round, data.block, data.validatorPublicKey, signature);
	}

	public async makePrevote(data: IMakePrevoteData, keyPair: Contracts.Crypto.IKeyPair): Promise<IPrevote> {
		const bytes = await this.serializer.serializePrevote(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Prevote(data.height, data.round, data.blockId, data.validatorPublicKey, signature);
	}

	public async makePrecommit(data: IMakePrecommitData, keyPair: Contracts.Crypto.IKeyPair): Promise<IPrecommit> {
		const bytes = await this.serializer.serializePrecommit(data, { excludeSignature: true });
		const signature: string = await this.signatureFactory.sign(bytes, Buffer.from(keyPair.privateKey, "hex"));
		return new Precommit(data.height, data.round, data.blockId, data.validatorPublicKey, signature);
	}
}
