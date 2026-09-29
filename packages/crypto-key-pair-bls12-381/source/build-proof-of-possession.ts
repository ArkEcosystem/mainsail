import { bls12_381 } from "@noble/curves/bls12-381.js";
import { bytesToHex, encodePacked, hexToBytes, isAddress } from "viem";

const POP_DST = new TextEncoder().encode("MAINSAIL_BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_");

const bls = bls12_381.longSignatures;

export function buildProofOfPossession(
	privateKey: Uint8Array,
	{ chainId, registrantAddress }: { chainId: number; registrantAddress: string },
): {
	pk: Uint8Array;
	pop: Uint8Array;
} {
	if (!isAddress(registrantAddress)) {
		throw new Error(`Invalid registrant address: ${registrantAddress}`);
	}

	// 1. Derive the compressed public key (48-byte G1).
	const pk = bls.getPublicKey(privateKey).toBytes();

	// 2. Hash chainId ‖ registrantAddress ‖ pk to a G2 point under POP_DST.
	//    (The DST is consumed here, not at sign time.)
	const message = encodePacked(["uint256", "address", "bytes"], [BigInt(chainId), registrantAddress, bytesToHex(pk)]);
	const messagePoint = bls.hash(hexToBytes(message), POP_DST);

	// 3. Sign the hashed G2 point with the secret key.
	const pop = bls.sign(messagePoint, privateKey).toBytes();

	return { pk, pop };
}
