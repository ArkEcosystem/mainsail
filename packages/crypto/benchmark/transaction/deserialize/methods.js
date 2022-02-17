const { Transactions } = require("../../../dist");

exports.deserialize = (data) => {
	return Transactions.Deserializer.deserialize(data);
};
