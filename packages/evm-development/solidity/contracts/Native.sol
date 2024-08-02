pragma solidity ^0.8.26;

contract Native {
	constructor() {}

	uint256 private _contractBalance;

	fallback() external payable {
		_contractBalance += msg.value;
	}

	receive() external payable {
		_contractBalance += msg.value;
	}

	function contractBalance() public view returns (uint256) {
		//	assert(address(this).balance == _contractBalance);
		return address(this).balance;
	}

	function balanceOf(address account) public view returns (uint256) {
		return account.balance;
	}

	function transfer(address to, uint256 amount) public payable {
		assert(address(this).balance >= amount);

		(bool sent, ) = to.call{value: amount}("");
		require(sent, "failed to transfer amount");
	}

	function transferMsgValue(address to) public payable {
		assert(address(this).balance >= msg.value);

		(bool sent, ) = to.call{value: msg.value}("");
		require(sent, "failed to transfer value");
	}

	function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external returns (bool) {
		require(recipients.length == amounts.length, "recipients and amounts length mismatch");

		for (uint256 i = 0; i < recipients.length; i++) {
			transfer(recipients[i], amounts[i]);
		}

		return true;
	}
}
