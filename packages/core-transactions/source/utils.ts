import { IConfiguration } from "@arkecosystem/core-crypto-contracts";

export const isRecipientOnActiveNetwork = (recipientId: string, base58, configuration: IConfiguration): boolean =>
	base58.decodeCheck(recipientId).readUInt8(0) === configuration.get("network.pubKeyHash");
