export interface Repository {
	databaseService: any;
	cache: any;
	model: any;
	query: any;
	columns: string[];

	getModel(): object;
}

export interface Resource {
	raw(resource): object;

	transform(resource): object;
}
