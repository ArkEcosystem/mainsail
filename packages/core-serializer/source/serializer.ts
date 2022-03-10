import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class Serializer implements Contracts.Serializer.ISerializer {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer: Contracts.Crypto.IAddressSerializer;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	private readonly publicKeySerializer: Contracts.Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureSerializer: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly transactionUtils: any;

	@inject(Identifiers.Cryptography.Size.HASH256)
	private readonly hashSize: number;

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

			if (schema.type === "uint32") {
				result.writeUint32(data[property]);
			}

			if (schema.type === "uint64") {
				result.writeUint64(data[property]);
			}

			if (schema.type === "bigint") {
				result.writeUint64(data[property].toString());
			}

			if (schema.type === "hash") {
				result.writeBytes(Buffer.from(data[property], "hex"));
			}

			if (schema.type === "address") {
				this.addressSerializer.serialize(result, await this.addressFactory.toBuffer(data[property]));
			}

			if (schema.type === "publicKey") {
				this.publicKeySerializer.serialize(result, data[property]);
			}

			if (schema.type === "signature") {
				this.signatureSerializer.serialize(result, data[property]);
			}

			if (schema.type === "transactions") {
				for (const transaction of data[property].values()) {
					const serialized: Buffer = await this.transactionUtils.toBytes(transaction);

					result.writeUint32(serialized.length);
					result.writeBytes(serialized);
				}
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
			}

			if (schema.type === "uint64") {
				target[property] = +source.readUint64().toString();
			}

			if (schema.type === "bigint") {
				target[property] = BigNumber.make(source.readUint64().toString());
			}

			if (schema.type === "hash") {
				target[property] = source.readBytes(schema.size ?? this.hashSize).toString("hex");
			}

			if (schema.type === "address") {
				target[property] = await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(source));
			}

			if (schema.type === "publicKey") {
				target[property] = this.publicKeySerializer.deserialize(source).toString("hex");
			}

			if (schema.type === "signature") {
				target[property] = this.signatureSerializer.deserialize(source).toString("hex");
			}

			if (schema.type === "transactions") {
				target[property] = [];

				for (let index = 0; index < (target as any).numberOfTransactions; index++) {
					target[property].push(source.readBytes(source.readUint32()));
				}
			}
		}

		return target;
	}
}
