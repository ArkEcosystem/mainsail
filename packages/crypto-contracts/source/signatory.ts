import { IKeyPair } from "./identities";

export interface Signatory {
    signSchnorr(hash: Buffer, keys: IKeyPair): string;

    verifySchnorr(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): boolean;
}
