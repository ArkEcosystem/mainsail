import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import Table3 from "cli-table3";

import type { Logger } from "../services/logger.js";

@injectable()
export class Table {
	@inject(Identifiers.Cli.Logger)
	private readonly logger!: Logger;

	public render(head: string[], callback: (table: Table3.Table) => void, options: object = {}): void {
		const table = new Table3({
			chars: { "left-mid": "", mid: "", "mid-mid": "", "right-mid": "" },
			head,
			...options,
		});

		callback(table);

		this.logger.log(table.toString());
	}
}
