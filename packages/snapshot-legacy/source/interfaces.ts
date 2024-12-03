export interface LegacySnapshot {
	readonly hash: string;
	readonly chainTip: { id: string; height: string };
	readonly wallets: LegacyWallet[];
}

export interface LegacyWallet {
	readonly address: string; // base58
	readonly publicKey?: string;
	readonly balance: string; // ARK - 8 decimals
	readonly nonce: string;
	readonly attributes: Record<string, string>;
}
