const { Blocks } = require("../../distribution");

const data = require("../helpers").getJSONFixture("block/deserialized/transactions");

exports["core"] = () => {
	return Blocks.Serializer.serializeWithTransactions(data);
};
