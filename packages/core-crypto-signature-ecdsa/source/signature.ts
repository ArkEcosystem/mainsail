import { Container } from "@arkecosystem/core-container";
import { ISignature } from "@arkecosystem/core-crypto-contracts";
import { secp256k1 } from "bcrypto";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class Signature implements ISignature {
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
		const signatureLength = (): number => {
			buffer.mark();

			const lengthHex: string = buffer.skip(1).readBytes(1).toString("hex");

			buffer.reset();

			return parseInt(lengthHex, 16) + 2;
		};

		if (typeof buffer.readBytes === "function") {
			return buffer.readBytes(signatureLength());
		}

		return buffer.readBuffer(signatureLength());
	}
}
