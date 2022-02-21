import { Container } from "@arkecosystem/container";

import { TransactionType, TransactionTypeGroup } from "../../enums";
import { Address } from "@arkecosystem/crypto-identities";
import { ISerializeOptions } from "@arkecosystem/crypto-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";
import * as schemas from "../schemas";
import { Transaction } from "../transaction";

@Container.injectable()
export abstract class TransferTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.Transfer;
	public static key = "transfer";
	public static version: number = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("10000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.transfer;
	}

	public hasVendorField(): boolean {
		return true;
	}

	public serialize(options?: ISerializeOptions): ByteBuffer | undefined {
		const { data } = this;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(33));
		buff.writeBigUInt64LE(data.amount.toBigInt());
		buff.writeUInt32LE(data.expiration || 0);

		if (data.recipientId) {
			const { addressBuffer, addressError } = Address.toBuffer(
				data.recipientId,
				this.configuration.get("network"),
			);

			if (options) {
				options.addressError = addressError;
			}

			buff.writeBuffer(addressBuffer);
		}

		return buff;
	}

	public deserialize(buf: ByteBuffer): void {
		const { data } = this;
		data.amount = BigNumber.make(buf.readBigUInt64LE().toString());
		data.expiration = buf.readUInt32LE();
		data.recipientId = Address.fromBuffer(buf.readBuffer(21));
	}
}
