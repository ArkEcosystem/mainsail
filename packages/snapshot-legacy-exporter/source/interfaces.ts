export interface LegacyChainTip {
	readonly hash: string;
	readonly number: string;
}

export interface LegacySnapshot {
	readonly hash: string;
	readonly chainTip: LegacyChainTip;
	readonly wallets: LegacyWallet[];
}

export interface LegacySnapshotManifest {
	readonly hash: string;
	readonly chainTip: LegacyChainTip;
	readonly wallets: number;
	readonly walletsWithPublicKey: number;
	readonly delegates: number;
	readonly resignedDelegates: number;
	readonly voters: number;
	readonly totalBalances: string;
	readonly positiveBalances: string;
	readonly negativeWallets: { readonly address: string; readonly balance: string }[];
	readonly forgedRewards: string;
	readonly producedBlocks: string;
	readonly droppedHtlcLocks: string;
}

export interface LegacyWallet {
	readonly arkAddress: string; // base58
	readonly publicKey?: string;
	readonly ethAddress?: string; // keccak256
	readonly balance: string; // ARK - 8 decimals
	readonly legacyNonce: string;
	readonly attributes?: Record<string, unknown>;
}
