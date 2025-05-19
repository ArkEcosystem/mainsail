// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_validator_registration_pass() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorRegistered(addr, prepareBLSKey(addr));
        consensus.registerValidator(prepareBLSKey(addr));
        vm.stopPrank();

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);
    }

    function test_validator_registration_revert_if_validator_is_already_registered() public {
        address addr = address(1);

        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));

        vm.expectRevert(ConsensusV1.ValidatorAlreadyRegistered.selector);
        consensus.registerValidator(prepareBLSKey(address(2)));
    }

    function test_validator_registration_revert_if_bls_key_is_already_registered() public {
        address addr = address(1);
        vm.startPrank(addr);

        consensus.registerValidator(prepareBLSKey(addr));

        vm.startPrank(address(2));
        vm.expectRevert(ConsensusV1.BlsKeyAlreadyRegistered.selector);
        consensus.registerValidator(prepareBLSKey(addr));
    }

    function test_validator_registration_revert_if_bls_key_length_is_invalid() public {
        address addr = address(1);
        vm.startPrank(addr);

        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 46));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 47));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 49));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.registerValidator(prepareBLSKey(addr, 50));
        vm.expectRevert(ConsensusV1.BlsKeyIsInvalid.selector);
        consensus.registerValidator(new bytes(0));
    }

    function test_is_validator_registered() public {
        assertEq(consensus.isValidatorRegistered(address(0)), false);
        assertEq(consensus.isValidatorRegistered(address(1)), false);

        address addr = address(1);
        registerValidator(addr);

        assertEq(consensus.isValidatorRegistered(address(1)), true);
    }

    function test_get_validator() public {
        address addr = address(1);

        vm.expectRevert(ConsensusV1.ValidatorNotRegistered.selector);
        consensus.getValidator(addr);

        registerValidator(addr);

        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
    }
}
