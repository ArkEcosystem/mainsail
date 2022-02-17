const { Transactions } = require("../../../distribution");

exports.deserialize = (data) => {
	return Transactions.Deserializer.deserialize(data);
};
