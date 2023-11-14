import { Contracts } from "@mainsail/contracts";
import { Attributes, Wallets } from "@mainsail/state";

export function getAttributeRepository(): Contracts.State.IAttributeRepository {
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

export function getIndexSet(): Contracts.State.IndexSet {
	const indexSet = new Wallets.IndexSet();
	indexSet.set(Contracts.State.WalletIndexes.Addresses);
	indexSet.set(Contracts.State.WalletIndexes.PublicKeys);
	indexSet.set(Contracts.State.WalletIndexes.Usernames);
	return indexSet;
}
