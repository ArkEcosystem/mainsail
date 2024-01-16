import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, ByteBuffer, validatorSetPack, validatorSetUnpack } from "@mainsail/utils";

@injectable()
export class Serializer implements Contracts.Serializer.Serializer {
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	@tagged("type", "wallet")
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Identity.Address.Serializer)
	@tagged("type", "wallet")
	private readonly addressSerializer!: Contracts.Crypto.AddressSerializer;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Serializer)
	@tagged("type", "wallet")
	private readonly publicKeySerializer!: Contracts.Crypto.PublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignatureSerializer!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly transactionUtils!: Contracts.Crypto.TransactionUtils;

	@inject(Identifiers.Cryptography.Hash.Size.HASH256)
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
			const value = data[property];

			if (schema.type === "uint8") {
				this.#writeOptional(schema, result, value, () => result.writeUint8(value));
				continue;
			}

			if (schema.type === "uint16") {
				this.#writeOptional(schema, result, value, () => result.writeUint16(value));
				continue;
			}

			if (schema.type === "uint32") {
				this.#writeOptional(schema, result, value, () => result.writeUint32(value));
				continue;
			}

			if (schema.type === "uint48") {
				this.#writeOptional(schema, result, value, () => result.writeUint48(value));
				continue;
			}

			if (schema.type === "uint64") {
				this.#writeOptional(schema, result, value, () => result.writeUint64(value));
				continue;
			}

			if (schema.type === "bigint") {
				this.#writeOptional(schema, result, value, () => result.writeUint64(value));
				continue;
			}

			if (schema.type === "hash") {
				result.writeBytes(Buffer.from(value, "hex"));
				continue;
			}

			if (schema.type === "blockId") {
				this.#writeOptional(schema, result, value, () => result.writeBytes(Buffer.from(value, "hex")));
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
				Utils.assert.array<boolean>(validatorSet);

				const packed = validatorSetPack(validatorSet);

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

					result.writeUint16(serialized.length);
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
				target[property] = this.#readOptional<number>(schema, source, () => source.readUint8());
				continue;
			}

			if (schema.type === "uint16") {
				target[property] = this.#readOptional<number>(schema, source, () => source.readUint16());
				continue;
			}

			if (schema.type === "uint32") {
				target[property] = this.#readOptional<number>(schema, source, () => source.readUint32());
				continue;
			}

			if (schema.type === "uint48") {
				target[property] = this.#readOptional<number>(schema, source, () => source.readUint48());
				continue;
			}

			if (schema.type === "uint64") {
				target[property] = this.#readOptional<number>(schema, source, () => +source.readUint64().toString());
				continue;
			}

			if (schema.type === "bigint") {
				target[property] = this.#readOptional<BigNumber>(schema, source, () =>
					BigNumber.make(source.readUint64().toString()),
				);

				continue;
			}

			if (schema.type === "hash") {
				target[property] = source.readBytes(schema.size ?? this.hashSize).toString("hex");
				continue;
			}

			if (schema.type === "blockId") {
				target[property] = this.#readOptional<string>(schema, source, () =>
					source.readBytes(this.hashSize).toString("hex"),
				);

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

				target[property] = validatorSetUnpack(packed, length);
				continue;
			}

			if (schema.type === "hex") {
				target[property] = { serialized: source.readBytes(source.readUint32()).toString("hex") };
				continue;
			}

			if (schema.type === "transactions") {
				target[property] = [];

				for (let index = 0; index < (target as any).numberOfTransactions; index++) {
					target[property].push(source.readBytes(source.readUint16()));
				}
				continue;
			}

			throw new Exceptions.NotImplemented(this.constructor.name, schema.type);
		}

		return target;
	}

	#writeOptional = (schema: { optional?: true }, result: ByteBuffer, value: any, write: () => void) => {
		if (schema.optional) {
			if (value === undefined) {
				result.writeUint8(0);
				return;
			} else {
				result.writeUint8(1);
			}
		}
		write();
	};

	#readOptional = <T>(schema: { optional?: true }, source: ByteBuffer, read: () => T): T | undefined => {
		if (schema.optional) {
			const isPresent = source.readUint8();
			if (isPresent === 0) {
				return undefined;
			}
		}
		return read();
	};
}
