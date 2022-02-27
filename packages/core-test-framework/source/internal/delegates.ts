// import passphrases from "./passphrases.json";

// export const addresses: string[] = passphrases.map((passphrase: string) =>
// 	addressFactory.fromMnemonic(passphrase),
// );

// export const publicKeys: string[] = passphrases.map((passphrase: string) =>
// 	publicKeyFactory.fromMnemonic(passphrase),
// );

// export const privateKeys: string[] = passphrases.map((passphrase: string) =>
// 	privateKeyFactory.fromMnemonic(passphrase),
// );

// export const wifs: string[] = passphrases.map((passphrase: string) => wifFactory.fromMnemonic(passphrase));

// export const delegates: {
// 	passphrase: string;
// 	address: string;
// 	publicKey: string;
// 	privateKey: string;
// 	wif: string;
// }[] = passphrases.map((passphrase: string) => ({
// 	address: addressFactory.fromMnemonic(passphrase),
// 	passphrase,
// 	privateKey: privateKeyFactory.fromMnemonic(passphrase),
// 	publicKey: publicKeyFactory.fromMnemonic(passphrase),
// 	wif: wifFactory.fromMnemonic(passphrase),
// }));

export { default as passphrases } from "./passphrases.json";
