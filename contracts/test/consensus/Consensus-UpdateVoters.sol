// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator, Unvoted, Voted} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function test_updateVoters_should_allow_only_caller() public {
		address addr = address(1);
		vm.startPrank(addr);
		address[] memory voters = new address[](0);
		vm.expectRevert("Caller is not the contract owner");
		consensus.updateVoters(voters);
	}
}
