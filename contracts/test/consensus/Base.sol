// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";

contract Base is Test {
	function prepareBLSKey(address addr, uint8 lenght) public pure returns (bytes memory) {
		bytes32 h = keccak256(abi.encode(addr));
		bytes memory validatorKey = new bytes(lenght);
		for (uint256 j = 0; j < 32; j++) {
			validatorKey[j] = h[j];
		}
		return validatorKey;
	}

	function prepareBLSKey(address addr) public pure returns (bytes memory) {
		return prepareBLSKey(addr, 48);
	}
}
