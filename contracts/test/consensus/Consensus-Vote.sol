// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {Consensus, ValidatorData, Validator, Unvoted, Voted, VoteResult} from "@contracts/consensus/Consensus.sol";

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
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

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

        // Assert validator
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        // Assert voters balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);

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
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 90 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);
    }

    function test_vote_revert_if_caller_is_owner() public {
        vm.expectRevert("Caller is the contract owner");
        consensus.vote(address(1));
    }

    function test_unvote_revert_if_did_not_vote() public {
        vm.expectRevert("Must vote for validator before unvote");
        consensus.unvote();
    }

    function test_get_voters_revert_if_caller_is_not_owner() public {
        vm.startPrank(address(1));

        vm.expectRevert("Caller is not the contract owner");
        consensus.getVotes(address(0), 10);
    }

    function test_vote_allow_self_vote() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

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

        // Assert voteBalance
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, voterAddr);

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
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 90 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, voterAddr);
    }

    function test_vote_prevent_double_vote_same_voter() public {
        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Prepare voter
        address voterAddr = address(2);

        vm.startPrank(voterAddr);
        vm.expectEmit(address(consensus));
        emit Voted(voterAddr, addr);
        consensus.vote(addr);

        vm.expectRevert("Already voted for this validator");
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

    function test_swap_vote() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address validatorAddr1 = address(1);
        registerValidator(validatorAddr1);

        address validatorAddr2 = address(2);
        registerValidator(validatorAddr2);

        // Vote
        address voterAddr = address(3);
        vm.deal(voterAddr, 100 ether);
        vm.startPrank(voterAddr);
        vm.expectEmit(address(consensus));
        emit Voted(voterAddr, validatorAddr1);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Assert validator 1
        Validator memory validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);
        // Assert validator 2
        Validator memory validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 0 ether);
        assertEq(validator2.data.votersCount, 0);

        // Assert voter balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, validatorAddr1);

        // Let say voter has 90 eth after some tx
        vm.deal(voterAddr, 90 ether);

        // Swap Vote
        vm.startPrank(voterAddr);
        vm.expectEmit(address(consensus));
        emit Voted(voterAddr, validatorAddr2);
        consensus.vote(validatorAddr2);
        vm.stopPrank();

        // Assert validator 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 0 ether);
        assertEq(validator1.data.votersCount, 0);
        // Assert validator 2
        validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 90 ether);
        assertEq(validator2.data.votersCount, 1);

        // Assert voter balance
        assertEq(voterAddr.balance, 90 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, validatorAddr2);
    }

    function test_unvote_and_vote_in_same_block() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Vote
        address voterAddr = address(2);
        vm.deal(voterAddr, 100 ether);
        vm.startPrank(voterAddr);
        consensus.vote(addr);
        vm.stopPrank();

        // Assert validator
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);

        // Let say voter has 90 eth after some tx
        vm.deal(voterAddr, 90 ether);

        // Unvote
        vm.startPrank(voterAddr);
        vm.expectEmit(address(consensus));
        emit Unvoted(voterAddr, addr);
        consensus.unvote();
        vm.stopPrank();

        // Assert validator
        validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 0 ether);
        assertEq(validator.data.votersCount, 0);
        /// Assert voter balance
        assertEq(voterAddr.balance, 90 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);
    }

    function test_unvote_and_vote_in_different_blocks() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Vote
        address voterAddr = address(2);
        vm.deal(voterAddr, 100 ether);
        vm.startPrank(voterAddr);
        consensus.vote(addr);
        vm.stopPrank();

        // Assert validator
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);

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
        assertEq(validator.data.votersCount, 1);
        // Assert voter balance
        assertEq(voterAddr.balance, 90 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);

        // Let say voter has 80 eth after some tx
        vm.deal(voterAddr, 80 ether);

        // Unvote
        vm.startPrank(voterAddr);
        vm.expectEmit(address(consensus));
        emit Unvoted(voterAddr, addr);
        consensus.unvote();
        vm.stopPrank();

        // Assert validator
        validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 0 ether);
        assertEq(validator.data.votersCount, 0);
        // Assert voter balance
        assertEq(voterAddr.balance, 80 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);
    }

    function test_multiple_voted_different_validators() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validators
        address validatorAddr1 = address(1);
        registerValidator(validatorAddr1);
        address validatorAddr2 = address(2);
        registerValidator(validatorAddr2);
        address validatorAddr3 = address(3);
        registerValidator(validatorAddr3);

        // Vote 1
        address voterAddr1 = address(11);
        vm.deal(voterAddr1, 100 ether);
        vm.startPrank(voterAddr1);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Vote 2
        address voterAddr2 = address(12);
        vm.deal(voterAddr2, 100 ether);
        vm.startPrank(voterAddr2);
        consensus.vote(validatorAddr2);
        vm.stopPrank();

        // Vote 3
        address voterAddr3 = address(13);
        vm.deal(voterAddr3, 100 ether);
        vm.startPrank(voterAddr3);
        consensus.vote(validatorAddr3);
        vm.stopPrank();

        // Assert validators 1
        Validator memory validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);
        // Assert validator 2
        Validator memory validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 100 ether);
        assertEq(validator2.data.votersCount, 1);
        // Assert validator 3
        Validator memory validator3 = consensus.getValidator(validatorAddr3);
        assertEq(validator3.addr, validatorAddr3);
        assertEq(validator3.data.voteBalance, 100 ether);
        assertEq(validator3.data.votersCount, 1);

        // Assert voters
        assertEq(consensus.getVotesCount(), 3);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 3);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);
        assertEq(allVoters[1].voter, voterAddr2);
        assertEq(allVoters[1].validator, validatorAddr2);
        assertEq(allVoters[2].voter, voterAddr3);
        assertEq(allVoters[2].validator, validatorAddr3);

        // UNVOTE
        // Middle voter
        vm.startPrank(voterAddr2);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);
        // Assert validator 2
        validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 0 ether);
        assertEq(validator2.data.votersCount, 0);
        // Assert validator 3
        validator3 = consensus.getValidator(validatorAddr3);
        assertEq(validator3.addr, validatorAddr3);
        assertEq(validator3.data.voteBalance, 100 ether);
        assertEq(validator3.data.votersCount, 1);

        // Assert voters
        assertEq(consensus.getVotesCount(), 2);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 2);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);
        assertEq(allVoters[1].voter, voterAddr3);
        assertEq(allVoters[1].validator, validatorAddr3);

        // UNVOTE
        // Last voter
        vm.startPrank(voterAddr3);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);
        // Assert validator 2
        validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 0 ether);
        assertEq(validator2.data.votersCount, 0);
        // Assert validator 3
        validator3 = consensus.getValidator(validatorAddr3);
        assertEq(validator3.addr, validatorAddr3);
        assertEq(validator3.data.voteBalance, 0 ether);
        assertEq(validator3.data.votersCount, 0);

        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);

        // UNVOTE
        // First voter
        vm.startPrank(voterAddr1);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 0 ether);
        assertEq(validator1.data.votersCount, 0);
        // Assert validator 2
        validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 0 ether);
        assertEq(validator2.data.votersCount, 0);
        // Assert validator 3
        validator3 = consensus.getValidator(validatorAddr3);
        assertEq(validator3.addr, validatorAddr3);
        assertEq(validator3.data.voteBalance, 0 ether);
        assertEq(validator3.data.votersCount, 0);

        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);
    }

    function test_multiple_voted_same_validator() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validators
        address validatorAddr1 = address(1);
        registerValidator(validatorAddr1);

        // Vote 1
        address voterAddr1 = address(11);
        vm.deal(voterAddr1, 100 ether);
        vm.startPrank(voterAddr1);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Vote 2
        address voterAddr2 = address(12);
        vm.deal(voterAddr2, 100 ether);
        vm.startPrank(voterAddr2);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Vote 3
        address voterAddr3 = address(13);
        vm.deal(voterAddr3, 100 ether);
        vm.startPrank(voterAddr3);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Assert validators 1
        Validator memory validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 300 ether);
        assertEq(validator1.data.votersCount, 3);

        // Assert voters
        assertEq(consensus.getVotesCount(), 3);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 3);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);
        assertEq(allVoters[1].voter, voterAddr2);
        assertEq(allVoters[1].validator, validatorAddr1);
        assertEq(allVoters[2].voter, voterAddr3);
        assertEq(allVoters[2].validator, validatorAddr1);

        // UNVOTE
        // Middle voter
        vm.startPrank(voterAddr2);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 200 ether);
        assertEq(validator1.data.votersCount, 2);

        // Assert voters
        assertEq(consensus.getVotesCount(), 2);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 2);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);
        assertEq(allVoters[1].voter, voterAddr3);
        assertEq(allVoters[1].validator, validatorAddr1);

        // UNVOTE
        // Last voter
        vm.startPrank(voterAddr3);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);

        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[0].validator, validatorAddr1);

        // UNVOTE
        // First voter
        vm.startPrank(voterAddr1);
        consensus.unvote();
        vm.stopPrank();

        // Assert validators 1
        validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 0 ether);
        assertEq(validator1.data.votersCount, 0);

        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);
    }

    function test_pagination() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validators
        address validatorAddr1 = address(1);
        registerValidator(validatorAddr1);

        // Vote 1
        address voterAddr1 = address(11);
        vm.deal(voterAddr1, 100 ether);
        vm.startPrank(voterAddr1);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Vote 2
        address voterAddr2 = address(12);
        vm.deal(voterAddr2, 100 ether);
        vm.startPrank(voterAddr2);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Vote 3
        address voterAddr3 = address(13);
        vm.deal(voterAddr3, 100 ether);
        vm.startPrank(voterAddr3);
        consensus.vote(validatorAddr1);
        vm.stopPrank();

        // Assert voters
        assertEq(consensus.getVotesCount(), 3);

        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 3);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[1].voter, voterAddr2);
        assertEq(allVoters[2].voter, voterAddr3);

        allVoters = consensus.getVotes(address(0), 2);
        assertEq(allVoters.length, 2);
        assertEq(allVoters[0].voter, voterAddr1);
        assertEq(allVoters[1].voter, voterAddr2);

        allVoters = consensus.getVotes(address(0), 1);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr1);

        allVoters = consensus.getVotes(address(0), 0);
        assertEq(allVoters.length, 0);

        allVoters = consensus.getVotes(voterAddr1, 10);
        assertEq(allVoters.length, 2);
        assertEq(allVoters[0].voter, voterAddr2);
        assertEq(allVoters[1].voter, voterAddr3);

        allVoters = consensus.getVotes(voterAddr1, 1);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr2);

        allVoters = consensus.getVotes(voterAddr2, 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr3);
    }
}
