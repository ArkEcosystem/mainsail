import { inject, injectable } from "@mainsail/container";
import Table3 from "cli-table3";

import { Identifiers } from "../ioc/index.js";
import type { Logger } from "../services/index.js";

@injectable()
export class Table {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(head: string[], callback: any, options: object = {}): void {
		const table = new Table3({
			chars: { "left-mid": "", mid: "", "mid-mid": "", "right-mid": "" },
			head,
			...options,
		});

		callback(table);

		this.logger.log(table.toString());
	}
}
