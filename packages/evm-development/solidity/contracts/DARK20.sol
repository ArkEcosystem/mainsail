pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DARK20 is ERC20 {
	constructor() ERC20("DARK20", "DARK20") {
		_mint(msg.sender, 100_000_000 ether);
	}

	function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external returns (bool) {
		require(recipients.length == amounts.length, "recipients and amounts length mismatch");

		for (uint256 i = 0; i < recipients.length; i++) {
			_transfer(_msgSender(), recipients[i], amounts[i]);
		}

		return true;
	}
}
