import { ITransaction } from "../crypto";

export interface ExpirationService {
	canExpire(transaction: ITransaction): boolean;
	isExpired(transaction: ITransaction): Promise<boolean>;
	getExpirationHeight(transaction: ITransaction): Promise<number>;
}
