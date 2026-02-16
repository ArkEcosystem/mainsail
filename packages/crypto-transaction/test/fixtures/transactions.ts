import { transactionContractCall as Deserialized_transactionContractCall, transactionContractCallWithSecondSignature as Deserialized_transactionContractCallWithSecondSignature, transactionDeploy as Deserialized_transactionDeploy,transactionTransfer as Deserialized_transactionTransfer } from "./deserialized.js"
import { transactionContractCall as Serialized_transactionContractCall, transactionContractCallWithSecondSignature as Serialized_transactionContractCallWithSecondSignature, transactionDeploy as Serialized_transactionDeploy,transactionTransfer as Serialized_transactionTransfer } from "./serialized.js"

export const transactionTransfer = {
	...Deserialized_transactionTransfer,
	from: '0x75545540230d5c3BEf023202d23CB74cFA723376',
	hash: '3a5823fe8f498b2e509974b3939584bd1200ad32fa32bc8a1a778b608f79f780',
	senderLegacyAddress: 'DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP',
  senderPublicKey: '03e0812731df97edc9990d55d919b33294f131b5fd44996266859cfd2514514121',
	legacySecondSignature: undefined,
	serialized: Buffer.from(Serialized_transactionTransfer, "hex"),
}

export const transactionContractCall= {
	...Deserialized_transactionContractCall,
  from: '0xbbe7B35057F3431E001d2b96817e3061B59849c9',
	hash: '1c54b0cd259d807f8b8a1afbedc36ffcd1ba2feaed306c6ac958b59644028572',
  senderLegacyAddress: 'DQogphvhHjJsqEhhR7befFiTzHQWLrQV3d',
  senderPublicKey: '02c9b561bc6daa0a89343237e92f4ac75022f260f6371c22a6bbe35dfe839938ec',
	legacySecondSignature: undefined,
	serialized: Buffer.from(Serialized_transactionContractCall, "hex"),
}

export const transactionContractCallWithSecondSignature= {
	...Deserialized_transactionContractCallWithSecondSignature,
	from: '0xbbe7B35057F3431E001d2b96817e3061B59849c9',
	hash: '1c54b0cd259d807f8b8a1afbedc36ffcd1ba2feaed306c6ac958b59644028572',
  senderLegacyAddress: 'DQogphvhHjJsqEhhR7befFiTzHQWLrQV3d',
  senderPublicKey: '02c9b561bc6daa0a89343237e92f4ac75022f260f6371c22a6bbe35dfe839938ec',
	serialized: Buffer.from(Serialized_transactionContractCallWithSecondSignature, "hex"),
}

export const transactionDeploy = {
	...Deserialized_transactionDeploy,
  from: '0xF9614BD538Cc0071ACE4723C54Ad7842b139C4D3',
	hash: '82800039759baa5c05356b1106995efa6334d3b321ec693ed04aaca482843618',
  senderLegacyAddress: 'D8BWYqMXcDqxsxJwsLYqVSCLu4DA1wibGw',
  senderPublicKey: '028786d7026170b8f76013282801f62feec4c1fb28ef9d95bc23e9f69c6b1b17c2',
	legacySecondSignature: undefined,
	serialized: Buffer.from(Serialized_transactionDeploy, "hex"),
}
