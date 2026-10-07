import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { secp256k1 } from "bcrypto";

@injectable()
export class Signature implements Contracts.Crypto.SignatureEcdsa {
	public async signRecoverable(message: Buffer, privateKey: Buffer): Promise<Contracts.Crypto.EcdsaSignature> {
		const [signature, recoverId] = secp256k1.signRecoverable(message, privateKey);

		return {
			r: signature.slice(0, 32).toString("hex"),
			s: signature.slice(32, 64).toString("hex"),
			v: recoverId,
		};
	}

	public async verifyRecoverable(
		signature: Contracts.Crypto.EcdsaSignature,
		message: Buffer,
		publicKey: Buffer,
	): Promise<boolean> {
		if (!this.isLowS(signature) || (signature.v !== 0 && signature.v !== 1)) {
			return false;
		}

		const recovered = secp256k1.recover(
			message,
			Buffer.from(signature.r + signature.s, "hex"),
			signature.v,
			publicKey.length === 33,
		);

		return recovered !== null && recovered.equals(publicKey);
	}

	public isLowS(signature: Contracts.Crypto.EcdsaSignature): boolean {
		return secp256k1.isLowS(Buffer.from(signature.r + signature.s, "hex"));
	}

	public recoverPublicKey(message: Buffer, signature: Contracts.Crypto.EcdsaSignature): string {
		const v = signature.v;
		const signatureRS = Buffer.from(signature.r + signature.s, "hex");
		return secp256k1.recover(message, signatureRS, v, true).toString("hex");
	}
}
