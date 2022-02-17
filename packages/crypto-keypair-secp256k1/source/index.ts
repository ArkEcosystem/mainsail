import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { secp256k1 } from "bcrypto";
import { SHA256 } from "bcrypto";

export class KeyPairFactory implements Contract {
    public fromMnemonic(mnemonic: string, compressed = true): IKeyPair {
        return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")), compressed);
    }

    public fromPrivateKey(privateKey: Buffer | string, compressed = true): IKeyPair {
        privateKey = privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey, "hex");

        return {
            publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
            privateKey: privateKey.toString("hex"),
            compressed,
        };
    }
}
