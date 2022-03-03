import { Services } from "@arkecosystem/core-kernel";

export function getWalletAttributeSet(): Services.Attributes.AttributeSet {
	const attributes: Services.Attributes.AttributeSet = new Services.Attributes.AttributeSet();
	attributes.set("validator.approval");
	attributes.set("validator.forgedFees");
	attributes.set("validator.forgedRewards");
	attributes.set("validator.forgedTotal");
	attributes.set("validator.lastBlock");
	attributes.set("validator.producedBlocks");
	attributes.set("validator.rank");
	attributes.set("validator.resigned");
	attributes.set("validator.round");
	attributes.set("validator.username");
	attributes.set("validator.voteBalance");
	attributes.set("validator");
	attributes.set("multiSignature");
	attributes.set("multiSignature.legacy");
	attributes.set("vote");

	return attributes;
}

export const knownAttributes: Services.Attributes.AttributeMap = new Services.Attributes.AttributeMap(
	getWalletAttributeSet(),
);
