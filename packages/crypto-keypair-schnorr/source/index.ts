import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { schnorr } from "bcrypto";
import { SHA256 } from "bcrypto";

export class KeyPairFactory implements Contract {
    public fromMnemonic(mnemonic: string): IKeyPair {
        return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")));
    }

    public fromPrivateKey(privateKey: Buffer | string): IKeyPair {
        privateKey = privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey, "hex");

        return {
            publicKey: schnorr.publicKeyCreate(privateKey).toString("hex"),
            privateKey: privateKey.toString("hex"),
            compressed: true,
        };
    }
}
