import { Store } from "./store";

export interface Exporter {
	export(store: Store): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, store: Store): Promise<void>;
}
