// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function test_vote() public {
		// Register validator
		address addr = address(1);

		bytes32 h = keccak256(abi.encode(addr));
		bytes memory validatorKey = new bytes(48);
		for (uint256 j = 0; j < 32; j++) {
			validatorKey[j] = h[j];
		}

		vm.startPrank(addr);
		consensus.registerValidator(validatorKey);
		vm.stopPrank();

		// Assert validator
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 0 ether);

		// Prepare voter
		address voterAddr = address(2);
		vm.deal(voterAddr, 100 ether);

		// Vote
		vm.startPrank(voterAddr);
		consensus.vote(addr);
		vm.stopPrank();

		// Assert validator
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 100 ether);
		// Assert voter balance
		assertEq(voterAddr.balance, 100 ether);

		// Update vote should correctly update the vote balance
		// Let say voter has 90 eth at the end of the block
		vm.deal(voterAddr, 90 ether);

		address[] memory voters = new address[](1);
		voters[0] = voterAddr;
		consensus.updateVoters(voters);

		// Assert validator
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 90 ether);
		// Assert voter balance
		assertEq(voterAddr.balance, 90 ether);
	}
}
