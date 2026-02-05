import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { getBls } from "@mainsail/crypto-key-pair-bls12-381";

@injectable()
export class Signature implements Contracts.Crypto.SignatureBls {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		const bls = await getBls();
		return Buffer.from(bls.SecretKey.fromBytes(privateKey).sign(message).toBytes()).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		const bls = await getBls();
		return bls.verify(
			bls.PublicKey.fromBytes(publicKey).toBytes(),
			message,
			bls.Signature.fromBytes(signature).toBytes(),
		);
	}

	public async aggregate(signatures: Buffer[]): Promise<string> {
		const bls = await getBls();
		return Buffer.from(
			bls.aggregateSignatures(signatures.map((s) => bls.Signature.fromBytes(s).toBytes())),
		).toString("hex");
	}
}
