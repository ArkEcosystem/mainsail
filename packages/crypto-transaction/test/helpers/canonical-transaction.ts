import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { TransactionBuilder } from "../../source/builder.js";
import { wallet } from "../fixtures/index.js";

export const signTransfer = async (app: Application, nonce = 0): Promise<Contracts.Crypto.TransactionData> => {
	const builder = app.resolve(TransactionBuilder);
	builder.recipientAddress(wallet.address);
	builder.nonce(String(nonce));

	await builder.signWithKeyPair({
		compressed: false,
		privateKey: wallet.privateKey,
		publicKey: wallet.publicKey,
	});

	return builder.getStruct();
};

// Standard Ethereum wallets RLP-encode r/s as minimal integers, stripping leading zero bytes.
// Sign transfers with increasing nonces until one has a leading zero byte in r or s
// (~1 in 128 signatures), so the minimal-RLP encoding is strictly shorter than 32 bytes.
// Signatures are deterministic (RFC 6979), so the same nonce is found on every run.
export const signUntilLeadingZeroRS = async (app: Application): Promise<Contracts.Crypto.TransactionData> => {
	for (let nonce = 0; nonce < 5000; nonce++) {
		const struct = await signTransfer(app, nonce);
		if (struct.r.startsWith("00") || struct.s.startsWith("00")) {
			return struct;
		}
	}

	throw new Error("could not find a signature with a leading-zero r/s byte");
};
