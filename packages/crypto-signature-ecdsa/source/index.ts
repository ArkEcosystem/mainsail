import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/core-kernel";
import { ByteBuffer } from "@mainsail/utils";

import { Signature } from "./signature";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.Signature).toFunction((buffer: ByteBuffer) => {
			buffer.mark();
			buffer.skip(1);

			const lengthHex: string = buffer.readBytes(1).toString("hex");

			buffer.reset();

			return Number.parseInt(lengthHex, 16) + 2;
		});

		this.app.bind(Identifiers.Cryptography.Signature).to(Signature).inSingletonScope();
	}
}
