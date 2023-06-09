import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class Serializer implements Contracts.Serializer.ISerializer {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	@tagged("type", "wallet")
	private readonly addressFactory!: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	@tagged("type", "wallet")
	private readonly addressSerializer!: Contracts.Crypto.IAddressSerializer;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	@tagged("type", "wallet")
	private readonly publicKeySerializer!: Contracts.Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly consensusSignatureSerializer!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly transactionUtils!: Contracts.Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Size.HASH256)
	private readonly hashSize!: number;

	public async serialize<T>(
		data: T,
		configuration: Contracts.Serializer.SerializationConfiguration,
	): Promise<Buffer> {
		const result: ByteBuffer = ByteBuffer.fromSize(configuration.length);

		if (configuration.skip > 0) {
			result.skip(configuration.skip);
		}

		for (const [property, schema] of Object.entries(configuration.schema)) {
			let value = data[property];
			const isOptional = schema["optional"] ?? false;

			if (!isOptional) {
				// TODO: temporary workaround for `getBlocksForRound` returning block data without a `transactions` field

				if (schema.type === "transactions") {
					value = value ?? [];
				}

				Utils.assert.defined(value);
			}

			if (schema.type === "uint8") {
				result.writeUint8(value);
				continue;
			}

			if (schema.type === "uint16") {
				result.writeUint16(value);
				continue;
			}

			if (schema.type === "uint32") {
				result.writeUint32(value);
				continue;
			}

			if (schema.type === "uint64") {
				result.writeUint64(value);
				continue;
			}

			if (schema.type === "bigint") {
				result.writeUint64(value.toString());
				continue;
			}

			if (schema.type === "hash") {
				result.writeBytes(Buffer.from(value, "hex"));
				continue;
			}

			if (schema.type === "blockId") {
				if (schema.optional) {
					// When marked as optional, prepend a length byte
					// to prevent having to pad the buffer for the full hash size.
					const blockId = value ?? "";
					result.writeUint8(blockId.length / 2);

					if (blockId) {
						result.writeBytes(Buffer.from(blockId, "hex"));
					}
				} else {
					result.writeBytes(Buffer.from(value, "hex"));
				}

				continue;
			}

			if (schema.type === "address") {
				this.addressSerializer.serialize(result, await this.addressFactory.toBuffer(value));
				continue;
			}

			if (schema.type === "publicKey") {
				this.publicKeySerializer.serialize(result, data[property]);
				continue;
			}

			if (schema.type === "signature") {
				this.signatureSerializer.serialize(result, data[property]);
				continue;
			}

			if (schema.type === "consensusSignature") {
				this.consensusSignatureSerializer.serialize(result, data[property]);
				continue;
			}

			if (schema.type === "validatorSet") {
				const validatorSet = data[property];
				Utils.assert.array(validatorSet);

				let packed = 0n;
				for (const [index, element] of validatorSet.entries()) {
					if (element) {
						packed += 2n ** BigInt(index);
					}
				}

				result.writeUint8(validatorSet.length);
				result.writeUint64(packed);

				continue;
			}

			if (schema.type === "hex") {
				Utils.assert.string(data[property]["serialized"]);

				const serialized = Buffer.from(data[property]["serialized"], "hex");
				result.writeUint32(serialized.length);
				result.writeBytes(serialized);
				continue;
			}

			if (schema.type === "transactions") {
				for (const transaction of value) {
					const serialized: Buffer = await this.transactionUtils.toBytes(transaction);

					result.writeUint32(serialized.length);
					result.writeBytes(serialized);
				}
				continue;
			}

			throw new Exceptions.NotImplemented(this.constructor.name, schema.type);
		}

		return result.toBuffer();
	}

	public async deserialize<T>(
		source: ByteBuffer,
		target: T,
		configuration: Contracts.Serializer.DeserializationConfiguration,
	): Promise<T> {
		for (const [property, schema] of Object.entries(configuration.schema)) {
			if (schema.type === "uint8") {
				target[property] = source.readUint8();
				continue;
			}

			if (schema.type === "uint16") {
				target[property] = source.readUint16();
				continue;
			}

			if (schema.type === "uint32") {
				target[property] = source.readUint32();
				continue;
			}

			if (schema.type === "uint64") {
				target[property] = +source.readUint64().toString();
				continue;
			}

			if (schema.type === "bigint") {
				target[property] = BigNumber.make(source.readUint64().toString());
				continue;
			}

			if (schema.type === "hash") {
				target[property] = source.readBytes(schema.size ?? this.hashSize).toString("hex");
				continue;
			}

			if (schema.type === "blockId") {
				// If the blockId is marked as optional, read the length first, otherwise
				// the length is equal to the hashSize.
				let blockId: string | undefined;
				if (schema.optional) {
					const blockIdLength = source.readUint8();
					if (blockIdLength > 0) {
						blockId = source.readBytes(blockIdLength).toString("hex");
					}
				} else {
					blockId = source.readBytes(this.hashSize).toString("hex");
				}

				target[property] = blockId;

				continue;
			}

			if (schema.type === "address") {
				target[property] = await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(source));
				continue;
			}

			if (schema.type === "publicKey") {
				target[property] = this.publicKeySerializer.deserialize(source).toString("hex");
				continue;
			}

			if (schema.type === "signature") {
				target[property] = this.signatureSerializer.deserialize(source).toString("hex");
				continue;
			}

			if (schema.type === "consensusSignature") {
				target[property] = this.consensusSignatureSerializer.deserialize(source).toString("hex");
				continue;
			}

			if (schema.type === "validatorSet") {
				const length = source.readUint8();
				const packed = source.readUint64();

				const validatorSet: boolean[] = [];
				for (let index = 0; index < length; index++) {
					const mask = 2n ** BigInt(index);
					const isSet = (packed & mask) > 0;
					validatorSet.push(isSet);
				}

				target[property] = validatorSet;
				continue;
			}

			if (schema.type === "hex") {
				target[property] = { serialized: source.readBytes(source.readUint32()).toString("hex") };
				continue;
			}

			if (schema.type === "transactions") {
				target[property] = [];

				for (let index = 0; index < (target as any).numberOfTransactions; index++) {
					target[property].push(source.readBytes(source.readUint32()));
				}
				continue;
			}

			throw new Exceptions.NotImplemented(this.constructor.name, schema.type);
		}

		return target;
	}
}
