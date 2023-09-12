import { Contracts } from "@mainsail/contracts";

import { AttributeRepository } from "../../../state/source/attributes/attribute-repository";

export function getWalletAttributeSet(): Contracts.State.IAttributeRepository {
	const attributes = new AttributeRepository();
	attributes.set("validatorRank", Contracts.State.AttributeType.Number);
	attributes.set("validatorResigned", Contracts.State.AttributeType.Boolean);
	attributes.set("validatorRound", Contracts.State.AttributeType.Number);
	attributes.set("validatorUsername", Contracts.State.AttributeType.String);
	attributes.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
	attributes.set("multiSignature", Contracts.State.AttributeType.Object);
	attributes.set("vote", Contracts.State.AttributeType.Object);
	return attributes;
}

export const knownAttributes: Contracts.State.IAttributeRepository = getWalletAttributeSet();
