import { DecryptResult } from "./crypto";

export interface BIP38 {
    verify(bip38: string): boolean;
    encrypt(privateKey: Buffer, compressed: boolean, passphrase: string): string;
    decrypt(bip38: string, passphrase: string): DecryptResult;
}
