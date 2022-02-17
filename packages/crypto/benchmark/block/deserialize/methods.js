const { Blocks } = require("../../../distribution");

exports.deserialize = (data) => {
	return Blocks.Deserializer.deserialize(data);
};
