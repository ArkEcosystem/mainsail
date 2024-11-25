export interface LegacySnapshot {
	readonly hash: string;
	readonly chainTip: { id: string; height: string };
	readonly wallets: LegacyWallet[];
}

export interface LegacyWallet {
	readonly address: string;
	readonly publicKey: string;
	readonly balance: string;
	readonly nonce: string;
	readonly attributes: Record<string, string>;
}
