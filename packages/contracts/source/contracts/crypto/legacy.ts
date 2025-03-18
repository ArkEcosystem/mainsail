export interface MultiSignatureLegacyAsset {
	min: number;
	lifetime: number;
	keysgroup: string[];
}

export interface MultiSignatureAsset {
	min: number;
	publicKeys: string[];
}
