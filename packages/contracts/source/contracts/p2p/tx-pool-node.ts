export interface TxPoolNode {
	readonly url: string;
	readonly ip: string;
	readonly port: number;
}

export type TxPoolNodeFactory = (ip: string) => TxPoolNode;

export interface TxPoolNodeVerifier {
	verify(node: TxPoolNode): Promise<boolean>;
}
