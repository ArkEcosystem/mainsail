import { BigNumber } from "@arkecosystem/utils";

export type WalletResource = {
	address: string;
	publicKey?: string;
	balance: BigNumber;
	nonce: BigNumber;
	attributes: object;
};
