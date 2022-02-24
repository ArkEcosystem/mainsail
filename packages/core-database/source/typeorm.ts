import * as ORM from "typeorm";

export const typeorm = {
	Connection: ORM.Connection,
	...ORM,
};
