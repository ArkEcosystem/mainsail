import { Contracts } from "@mainsail/contracts";

export const request = {
	headers: {
		version: "0.0.1",
	},
};

export const response: Contracts.P2P.PeerPingResponse = {
	config: {
		network: {
			explorer: "https://explorer.ark.io",
			name: "testnet",
			nethash: "ac4279c60e87b4b788475bd86f2cc461f4ea2b786cb5f25f8c3c0fc292524982",
			token: { name: "ARK", symbol: "TѦ" },
			version: 30,
		},
		plugins: {
			"@mainsail/api": { enabled: true, port: 4003 },
			"@mainsail/webhooks": { enabled: false, port: 4004 },
		},
		version: "0.0.1",
	},
	state: {
		currentSlot: 4_272_811,
		forgingAllowed: true,
		header: {
			blockSignature:
				"1afe7f94fcb7c74447a4cfc972eaa080cb3bafa9f2468af6c6554cc21e30470017af65bfc73d55ad6c5b551e41299e052fde636ecc2940bcddea9ea8f0c23861",
			generatorPublicKey: "c5bcb4da70e688cb56c32451479c435293d9d54e6be1451621d1d4972ac1ac01",
			height: 3,
			id: "70e20568d4a346da847dc1a8a7493e70e5a028709b7dfb6ec6da171d0daa03b5",
			numberOfTransactions: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			payloadLength: 0,
			previousBlock: "53abed3d396b36fbda37a14c904fcc5f45c619fccd26d2ffc79ca91bdf473357",
			reward: "0",
			timestamp: 1_681_744_088,
			totalAmount: "0",
			totalFee: "0",
			transactions: [],
			version: 1,
		},
		height: 3,
	},
};
