import { Contracts } from "@mainsail/contracts";
import { Attributes } from "@mainsail/state";

export function getAttributeRepository(): Contracts.State.AttributeRepository {
	const attributes = new Attributes.AttributeRepository();
	attributes.set("balance", Contracts.State.AttributeType.BigNumber);
	attributes.set("nonce", Contracts.State.AttributeType.BigNumber);
	attributes.set("publicKey", Contracts.State.AttributeType.String);
	attributes.set("validatorRank", Contracts.State.AttributeType.Number);
	attributes.set("validatorResigned", Contracts.State.AttributeType.Boolean);
	attributes.set("validatorPublicKey", Contracts.State.AttributeType.String);
	attributes.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
	attributes.set("validatorApproval", Contracts.State.AttributeType.Number);
	attributes.set("multiSignature", Contracts.State.AttributeType.Object);
	attributes.set("vote", Contracts.State.AttributeType.String);
	return attributes;
}

