// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    ValidatorRegistered,
    CallerIsOwner,
    ValidatorAlreadyRegistered,
    BlsKeyAlreadyRegistered,
    BlsKeyIsInvalid
} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    ConsensusV1 public consensus;

    function setUp() public {
        bytes memory data = abi.encode(ConsensusV1.initialize.selector);
        address proxy = address(new ERC1967Proxy(address(new ConsensusV1()), data));
        consensus = ConsensusV1(proxy);
    }

    function test_validator_registration_pass() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorRegistered(addr, prepareBLSKey(addr));
        consensus.registerValidator(prepareBLSKey(addr));
        vm.stopPrank();

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);
    }

    function test_validator_registration_revert_if_caller_is_owner() public {
        vm.expectRevert(CallerIsOwner.selector);
        consensus.registerValidator(prepareBLSKey(address(1)));
    }

    function test_validator_registration_revert_if_validator_is_already_registered() public {
        address addr = address(1);

        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(ValidatorAlreadyRegistered.selector);
        consensus.registerValidator(prepareBLSKey(address(2)));
    }

    function test_validator_registration_revert_if_bls_key_is_already_registered() public {
        address addr = address(1);
        vm.startPrank(addr);

        consensus.registerValidator(prepareBLSKey(addr));

        vm.startPrank(address(2));
        vm.expectRevert(BlsKeyAlreadyRegistered.selector);
        consensus.registerValidator(prepareBLSKey(addr));
    }

    function test_validator_registration_revert_if_bls_key_length_is_invalid() public {
        address addr = address(1);
        vm.startPrank(addr);

        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 46));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 47));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 49));
        vm.expectRevert(BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 50));
    }
}
