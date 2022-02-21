import { Container } from "@arkecosystem/container";

import { TransactionType, TransactionTypeGroup } from "../../enums";
import { IMultiSignatureAsset, ISerializeOptions, ITransactionData } from "@arkecosystem/crypto-contracts";

import { BigNumber, ByteBuffer } from "@arkecosystem/utils";
import * as schemas from "../schemas";
import { Transaction } from "../transaction";
import { Configuration } from "@arkecosystem/crypto-config";

@Container.injectable()
export class MultiSignatureRegistrationTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.MultiSignature;
	public static key = "multiSignature";
	public static version: number = 2;

	protected static defaultStaticFee: BigNumber = BigNumber.make("500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.multiSignature;
	}

	public static staticFee(
		configuration: Configuration,
		feeContext: { height?: number; data?: ITransactionData } = {},
	): BigNumber {
		if (feeContext.data?.asset?.multiSignature) {
			return super
				.staticFee(configuration, feeContext)
				.times(feeContext.data.asset.multiSignature.publicKeys.length + 1);
		}

		return super.staticFee(configuration, feeContext);
	}

	public async verify(): Promise<boolean> {
		return this.configuration.getMilestone().aip11 && (await super.verify());
	}

	public serialize(options?: ISerializeOptions): ByteBuffer | undefined {
		const { data } = this;
		const { min, publicKeys } = data.asset!.multiSignature!;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(2 + publicKeys.length * 33));

		buff.writeUInt8(min);
		buff.writeUInt8(publicKeys.length);

		for (const publicKey of publicKeys) {
			buff.writeBuffer(Buffer.from(publicKey, "hex"));
		}

		return buff;
	}

	public deserialize(buf: ByteBuffer): void {
		const { data } = this;

		const multiSignature: IMultiSignatureAsset = { publicKeys: [], min: 0 };
		multiSignature.min = buf.readUInt8();

		const count = buf.readUInt8();
		for (let i = 0; i < count; i++) {
			const publicKey = buf.readBuffer(33).toString("hex");
			multiSignature.publicKeys.push(publicKey);
		}

		data.asset = { multiSignature };
	}
}
