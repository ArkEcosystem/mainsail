import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class Serializer implements Contracts.Serializer.ISerializer {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory!: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer!: Contracts.Crypto.IAddressSerializer;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	private readonly publicKeySerializer!: Contracts.Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureSerializer!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly transactionUtils: any;

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
			if (data[property] === undefined && schema.required === false) {
				continue;
			}

			const value = data[property];
			if (schema.required) {
				Utils.assert.defined(value);
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

				if (value === undefined) {
					const nullBlockId = "0000000000000000000000000000000000000000000000000000000000000000";
					result.writeBytes(Buffer.from(nullBlockId, "hex"));
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
				if (value === undefined) {
					// TODO
				} else {
					this.signatureSerializer.serialize(result, data[property]);
				}

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
				for (const transaction of data[property].values()) {
					const serialized: Buffer = await this.transactionUtils.toBytes(transaction);

					result.writeUint32(serialized.length);
					result.writeBytes(serialized);
				}
				continue;
			}
		}

		return result.toBuffer();
	}

	public async deserialize<T>(
		source: ByteBuffer,
		target: T,
		configuration: Contracts.Serializer.DeserializationConfiguration,
	): Promise<T> {
		for (const [property, schema] of Object.entries(configuration.schema)) {
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
				target[property] = source.readBytes(schema.size ?? this.hashSize).toString("hex");
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

			if (schema.type === "hex") {
				target[property] = source.readBytes(source.readUint32()).toString("hex");
				continue;
			}

			if (schema.type === "transactions") {
				target[property] = [];

				for (let index = 0; index < (target as any).numberOfTransactions; index++) {
					target[property].push(source.readBytes(source.readUint32()));
				}
				continue;
			}
		}

		return target;
	}
}
