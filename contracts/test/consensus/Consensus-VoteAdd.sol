// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConsensusTest is Base {
    function test_add_vote_pass() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Prepare voter
        address voterAddr = address(2);
        vm.deal(voterAddr, 100 ether);

        // Vote
        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);
        address[] memory voters = new address[](1);
        voters[0] = voterAddr;
        address[] memory validators = new address[](1);
        validators[0] = addr;

        consensus.addVotes(voters, validators);

        // Assert validator
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        assertEq(validator.data.isResigned, false);
        // Assert voters balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);
    }

    function test_add_vote_pass_for_resigned_validator() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        consensus.addValidator(addr, prepareBLSKey(addr), true);

        // Prepare voter
        address voterAddr = address(2);
        vm.deal(voterAddr, 100 ether);

        // Vote
        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);
        address[] memory voters = new address[](1);
        voters[0] = voterAddr;
        address[] memory validators = new address[](1);
        validators[0] = addr;
        consensus.addVotes(voters, validators);

        // Assert validator
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        assertEq(validator.data.isResigned, true);
        // Assert voters balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);
    }

    function test_add_vote_pass_for_validator_without_bls_key() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        consensus.addValidator(addr, new bytes(0), false);

        // Prepare voter
        address voterAddr = address(2);
        vm.deal(voterAddr, 100 ether);

        // Vote
        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);
        address[] memory voters = new address[](1);
        voters[0] = voterAddr;
        address[] memory validators = new address[](1);
        validators[0] = addr;
        consensus.addVotes(voters, validators);

        // Assert validator
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.voteBalance, 100 ether);
        assertEq(validator.data.votersCount, 1);
        assertEq(validator.data.isResigned, false);
        // Assert voters balance
        assertEq(voterAddr.balance, 100 ether);
        // Assert voters
        assertEq(consensus.getVotesCount(), 1);
        allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 1);
        assertEq(allVoters[0].voter, voterAddr);
        assertEq(allVoters[0].validator, addr);
    }

    function test_add_vote_revert_if_caller_is_not_owner() public {
        address addr = address(1);
        address[] memory voters = new address[](1);
        voters[0] = addr;
        address[] memory validators = new address[](1);
        validators[0] = addr;

        vm.startPrank(addr);
        vm.expectRevert(abi.encodeWithSelector(OwnableUpgradeable.OwnableUnauthorizedAccount.selector, addr));
        consensus.addVotes(voters, validators);
    }

    function test_add_vote_revert_if_round_already_calculated() public {
        address addr = address(1);
        address[] memory voters = new address[](1);
        voters[0] = addr;
        address[] memory validators = new address[](1);
        validators[0] = addr;

        consensus.addValidator(addr, prepareBLSKey(addr), false);

        consensus.calculateActiveValidators(1);

        vm.expectRevert(ConsensusV1.ImportIsNotAllowed.selector);

        consensus.addVotes(voters, validators);
    }

    function test_add_vote_allow_self_vote() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Prepare voter
        address voterAddr = addr;
        vm.deal(voterAddr, 100 ether);

        // Vote
        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);

        address[] memory voters = new address[](1);
        voters[0] = voterAddr;
        address[] memory validators = new address[](1);
        validators[0] = addr;
        consensus.addVotes(voters, validators);
        vm.stopPrank();

        // Assert voteBalance
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
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
    }

    function test_add_vote_prevent_double_vote() public {
        // Register validator
        address addr = address(1);
        registerValidator(addr);

        // Prepare voter
        address voterAddr = address(2);

        address[] memory voters = new address[](1);
        voters[0] = voterAddr;
        address[] memory validators = new address[](1);
        validators[0] = addr;

        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);

        consensus.addVotes(voters, validators);

        vm.expectRevert(ConsensusV1.AlreadyVoted.selector);
        consensus.addVotes(voters, validators);
    }

    function test_add_vote_prevent_vote_for_unregistered_validator() public {
        address addr = address(1);

        address[] memory voters = new address[](1);
        voters[0] = addr;
        address[] memory validators = new address[](1);
        validators[0] = addr;

        vm.expectRevert(ConsensusV1.ValidatorNotRegistered.selector);
        consensus.addVotes(voters, validators);
    }

    function test_multiple_voted_different_validators() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
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

        // Vote 2
        address voterAddr2 = address(12);
        vm.deal(voterAddr2, 100 ether);

        // Vote 3
        address voterAddr3 = address(13);
        vm.deal(voterAddr3, 100 ether);

        address[] memory voters = new address[](3);
        voters[0] = voterAddr1;
        voters[1] = voterAddr2;
        voters[2] = voterAddr3;
        address[] memory validators = new address[](3);
        validators[0] = validatorAddr1;
        validators[1] = validatorAddr2;
        validators[2] = validatorAddr3;
        consensus.addVotes(voters, validators);

        // Assert validators 1
        ConsensusV1.Validator memory validator1 = consensus.getValidator(validatorAddr1);
        assertEq(validator1.addr, validatorAddr1);
        assertEq(validator1.data.voteBalance, 100 ether);
        assertEq(validator1.data.votersCount, 1);
        // Assert validator 2
        ConsensusV1.Validator memory validator2 = consensus.getValidator(validatorAddr2);
        assertEq(validator2.addr, validatorAddr2);
        assertEq(validator2.data.voteBalance, 100 ether);
        assertEq(validator2.data.votersCount, 1);
        // Assert validator 3
        ConsensusV1.Validator memory validator3 = consensus.getValidator(validatorAddr3);
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
    }

    function test_multiple_voted_same_validator() public {
        // Assert voters
        assertEq(consensus.getVotesCount(), 0);
        ConsensusV1.VoteResult[] memory allVoters = consensus.getVotes(address(0), 10);
        assertEq(allVoters.length, 0);

        // Register validators
        address validatorAddr1 = address(1);
        registerValidator(validatorAddr1);

        // Vote 1
        address voterAddr1 = address(11);
        vm.deal(voterAddr1, 100 ether);

        // Vote 2
        address voterAddr2 = address(12);
        vm.deal(voterAddr2, 100 ether);

        // Vote 3
        address voterAddr3 = address(13);
        vm.deal(voterAddr3, 100 ether);

        address[] memory voters = new address[](3);
        voters[0] = voterAddr1;
        voters[1] = voterAddr2;
        voters[2] = voterAddr3;
        address[] memory validators = new address[](3);
        validators[0] = validatorAddr1;
        validators[1] = validatorAddr1;
        validators[2] = validatorAddr1;
        consensus.addVotes(voters, validators);

        // Assert validators 1
        ConsensusV1.Validator memory validator1 = consensus.getValidator(validatorAddr1);
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
    }

    function test_add_vote_unvote() public {
        // Register validator
        address addr = address(1);
        registerValidator(addr);

        address voterAddr = address(2);

        address[] memory voters = new address[](2);
        voters[0] = addr;
        voters[1] = voterAddr;

        address[] memory validators = new address[](2);
        validators[0] = addr;
        validators[1] = addr;

        vm.expectEmit(address(consensus));
        emit ConsensusV1.Voted(voterAddr, addr);
        emit ConsensusV1.Voted(addr, addr);
        consensus.addVotes(voters, validators);

        // Unvote
        vm.prank(addr);

        vm.expectEmit(address(consensus));
        emit ConsensusV1.Unvoted(addr, addr);
        consensus.unvote();
    }
}
