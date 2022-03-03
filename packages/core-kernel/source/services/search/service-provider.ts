import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { PaginationService } from "./pagination-service";
import { StandardCriteriaService } from "./standard-criteria-service";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<StandardCriteriaService>(Identifiers.StandardCriteriaService).to(StandardCriteriaService);
		this.app.bind<PaginationService>(Identifiers.PaginationService).to(PaginationService);
	}
}
