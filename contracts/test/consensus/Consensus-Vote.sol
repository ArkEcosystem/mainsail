// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator, Unvoted, Voted} from "@contracts/consensus/Consensus.sol";

contract ConsensusTest is Test {
	Consensus public consensus;

	function setUp() public {
		consensus = new Consensus();
	}

	function registerValidator(address addr) internal {
		bytes32 h = keccak256(abi.encode(addr));
		bytes memory validatorKey = new bytes(48);
		for (uint256 j = 0; j < 32; j++) {
			validatorKey[j] = h[j];
		}

		vm.startPrank(addr);
		consensus.registerValidator(validatorKey);
		vm.stopPrank();

		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 0 ether);
		assertEq(validator.data.votersCount, 0);
	}

	function resignValidator(address addr) internal {
		vm.startPrank(addr);
		consensus.resignValidator();
		vm.stopPrank();
	}

	function test_vote() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);

		// Prepare voter
		address voterAddr = address(2);
		vm.deal(voterAddr, 100 ether);

		// Vote
		vm.startPrank(voterAddr);
		vm.expectEmit(address(consensus));
		emit Voted(voterAddr, addr);
		consensus.vote(addr);
		vm.stopPrank();

		// Assert voteBalance and voter balance
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 100 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 100 ether);

		// Update vote should correctly update the vote balance
		// Let say voter has 90 eth at the end of the block
		vm.deal(voterAddr, 90 ether);

		address[] memory voters = new address[](1);
		voters[0] = voterAddr;
		consensus.updateVoters(voters);

		// Assert voteBalance and voter balance
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 90 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 90 ether);
	}

	function test_vote_revert_if_caller_is_owner() public {
		vm.expectRevert("Caller is the contract owner");
		consensus.vote(address(1));
	}

	function test_vote_allow_self_vote() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);

		// Prepare voter
		address voterAddr = addr;
		vm.deal(voterAddr, 100 ether);

		// Vote
		vm.startPrank(voterAddr);
		vm.expectEmit(address(consensus));
		emit Voted(voterAddr, addr);
		consensus.vote(addr);
		vm.stopPrank();

		// Assert voteBalance and voter balance
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 100 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 100 ether);

		// Update vote should correctly update the vote balance
		// Let say voter has 90 eth at the end of the block
		vm.deal(voterAddr, 90 ether);

		address[] memory voters = new address[](1);
		voters[0] = voterAddr;
		consensus.updateVoters(voters);

		// Assert voteBalance and voter balance
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 90 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 90 ether);
	}

	function test_vote_prevent_double_vote() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);

		// Prepare voter
		address voterAddr = address(2);

		vm.startPrank(voterAddr);
		vm.expectEmit(address(consensus));
		emit Voted(voterAddr, addr);
		consensus.vote(addr);

		vm.expectRevert("Already voted");
		consensus.vote(addr);
	}

	function test_vote_prevent_for_unregistered_validator() public {
		address addr = address(1);

		vm.startPrank(addr);
		vm.expectRevert("Must vote for validator");
		consensus.vote(addr);
	}

	function test_vote_prevent_for_resigned_validator() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);
		resignValidator(addr);

		// Prepare voter
		address voterAddr = address(2);
		vm.startPrank(voterAddr);
		vm.expectRevert("Must vote for unresigned validator");
		consensus.vote(addr);
	}

	function test_unvote_and_vote_in_same_block() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);

		// Vote
		address voterAddr = address(2);
		vm.deal(voterAddr, 100 ether);
		vm.startPrank(voterAddr);
		consensus.vote(addr);
		vm.stopPrank();

		// Assert voteBalance and voter balance
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 100 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 100 ether);

		// Let say voter has 90 eth after some tx
		vm.deal(voterAddr, 90 ether);

		// Unvote
		vm.startPrank(voterAddr);
		vm.expectEmit(address(consensus));
		emit Unvoted(voterAddr, addr);
		consensus.unvote();
		vm.stopPrank();

		// Assert voteBalance and voter balance
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 0 ether);
		assertEq(validator.data.votersCount, 0);
		assertEq(voterAddr.balance, 90 ether);
	}

	function test_unvote_and_vote_in_different_blocks() public {
		// Register validator
		address addr = address(1);
		registerValidator(addr);

		// Vote
		address voterAddr = address(2);
		vm.deal(voterAddr, 100 ether);
		vm.startPrank(voterAddr);
		consensus.vote(addr);
		vm.stopPrank();

		// Assert voteBalance and voter balance
		Validator memory validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 100 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 100 ether);

		// Update vote should correctly update the vote balance
		// Let say voter has 90 eth at the end of the block
		vm.deal(voterAddr, 90 ether);
		address[] memory voters = new address[](1);
		voters[0] = voterAddr;
		consensus.updateVoters(voters);

		// Assert voteBalance and voter balance
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 90 ether);
		assertEq(validator.data.votersCount, 1);
		assertEq(voterAddr.balance, 90 ether);

		// Let say voter has 80 eth after some tx
		vm.deal(voterAddr, 80 ether);

		// Unvote
		vm.startPrank(voterAddr);
		vm.expectEmit(address(consensus));
		emit Unvoted(voterAddr, addr);
		consensus.unvote();
		vm.stopPrank();

		// Assert voteBalance and voter balance
		validator = consensus.getValidator(addr);
		assertEq(validator.addr, addr);
		assertEq(validator.data.voteBalance, 0 ether);
		assertEq(validator.data.votersCount, 0);
		assertEq(voterAddr.balance, 80 ether);
	}

	// TODO: Test multiple votes
}
