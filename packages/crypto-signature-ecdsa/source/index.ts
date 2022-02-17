import { Signatory as Contract } from "@arkecosystem/crypto-contracts";
import { secp256k1 } from "bcrypto";

export class Signatory implements Contract {
    public sign(hash: Buffer, privateKey: Buffer): string {
        return secp256k1.signatureExport(secp256k1.sign(hash, privateKey)).toString("hex");
    }

    public verify(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): boolean {
        const bufferSignature = signature instanceof Buffer ? signature : Buffer.from(signature, "hex");
        const signatureRS = secp256k1.signatureImport(bufferSignature);

        if (!secp256k1.isLowS(signatureRS)) {
            return false;
        }

        // check that global signature length matches R and S length, see DER format :
        // <header byte><signature length><integer marker><R length><R><integer marker><S length><S>
        const signatureLength = bufferSignature.readUInt8(1);
        const rLength = bufferSignature.readUInt8(3);
        const sLength = bufferSignature.readUInt8(4 + rLength + 1);
        if (
            bufferSignature.length !== 4 + rLength + 2 + sLength ||
            signatureLength !== 2 + rLength + 2 + sLength ||
            signatureLength > 127
        ) {
            return false;
        }

        // check that first byte is positive, if it is then the whole R / S will be positive as required
        const rFirstByte = bufferSignature.readInt8(4);
        const sFirstByte = bufferSignature.readInt8(4 + rLength + 2);
        if (rFirstByte < 0 || sFirstByte < 0 || rFirstByte > 127 || sFirstByte > 127) {
            return false;
        }

        // if first byte is zero it is to make R/S positive, so second byte should be negative
        if (
            (rFirstByte === 0 && bufferSignature.readInt8(4 + 1) >= 0) ||
            (sFirstByte === 0 && bufferSignature.readInt8(4 + rLength + 2 + 1) >= 0)
        ) {
            return false;
        }

        return secp256k1.verify(
            hash,
            signatureRS,
            publicKey instanceof Buffer ? publicKey : Buffer.from(publicKey, "hex"),
        );
    }
}
