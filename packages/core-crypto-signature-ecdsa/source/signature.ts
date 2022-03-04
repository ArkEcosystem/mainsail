import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { secp256k1 } from "bcrypto";
import ByteBuffer from "bytebuffer";

@injectable()
export class Signature implements Contracts.Crypto.ISignature {
	@inject(Identifiers.Cryptography.Size.Signature)
	private readonly signatureSize: Function;

	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return secp256k1.signatureExport(secp256k1.sign(message, privateKey)).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		const signatureRS = secp256k1.signatureImport(signature);

		if (!secp256k1.isLowS(signatureRS)) {
			return false;
		}

		// check that global signature length matches R and S length, see DER format :
		// <header byte><signature length><integer marker><R length><R><integer marker><S length><S>
		const signatureLength = signature.readUInt8(1);
		const rLength = signature.readUInt8(3);
		const sLength = signature.readUInt8(4 + rLength + 1);
		if (
			signature.length !== 4 + rLength + 2 + sLength ||
			signatureLength !== 2 + rLength + 2 + sLength ||
			signatureLength > 127
		) {
			return false;
		}

		// check that first byte is positive, if it is then the whole R / S will be positive as required
		const rFirstByte = signature.readInt8(4);
		const sFirstByte = signature.readInt8(4 + rLength + 2);
		if (rFirstByte < 0 || sFirstByte < 0 || rFirstByte > 127 || sFirstByte > 127) {
			return false;
		}

		// if first byte is zero it is to make R/S positive, so second byte should be negative
		if (
			(rFirstByte === 0 && signature.readInt8(4 + 1) >= 0) ||
			(sFirstByte === 0 && signature.readInt8(4 + rLength + 2 + 1) >= 0)
		) {
			return false;
		}

		return secp256k1.verify(message, signatureRS, publicKey);
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.append(signature, "hex");
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		if (typeof buffer.readBytes === "function") {
			return buffer.readBytes(this.signatureSize(buffer));
		}

		return buffer.readBuffer(this.signatureSize(buffer));
	}
}
