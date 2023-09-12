import { Services } from "@mainsail/kernel";

export function getWalletAttributeSet(): Services.Attributes.AttributeSet {
	const attributes: Services.Attributes.AttributeSet = new Services.Attributes.AttributeSet();
	attributes.set("validatorRank");
	attributes.set("validatorResigned");
	attributes.set("validatorRound");
	attributes.set("validatorUsername");
	attributes.set("validatorVoteBalance");
	attributes.set("multiSignature");
	attributes.set("vote");

	return attributes;
}

export const knownAttributes: Services.Attributes.AttributeMap = new Services.Attributes.AttributeMap(
	getWalletAttributeSet(),
);
