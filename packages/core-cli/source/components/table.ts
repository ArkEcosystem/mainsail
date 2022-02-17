import Table3 from "cli-table3";

import { Identifiers, inject, injectable } from "../ioc";
import { Logger } from "../services";

@injectable()
export class Table {
	@inject(Identifiers.Logger)
	private readonly logger!: Logger;

	public render(head: string[], callback: any, opts: object = {}): void {
		const table = new Table3({
			...{
				head,
				chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
			},
			...opts,
		});

		callback(table);

		this.logger.log(table.toString());
	}
}
