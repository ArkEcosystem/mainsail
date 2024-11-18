// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    ValidatorResigned,
    ValidatorAlreadyResigned,
    CallerIsNotValidator,
    BellowMinValidators
} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ConsensusTest is Base {
    function test_validator_resignation_pass() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 2);
        Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorResigned(addr);
        consensus.resignValidator();
        vm.stopPrank();

        assertEq(consensus.registeredValidatorsCount(), 2);
        validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, true);
    }

    function test_validator_resignation_revert_if_caller_is_not_validator() public {
        vm.expectRevert(CallerIsNotValidator.selector);
        consensus.resignValidator();
    }

    function test_validator_resignation_revert_if_resigned() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 2);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorResigned(addr);
        consensus.resignValidator();

        vm.expectRevert(ValidatorAlreadyResigned.selector);
        consensus.resignValidator();
    }

    function test_validator_resignation_revert_if_bellow_min_validators() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);

        // Act
        vm.startPrank(addr);
        vm.expectRevert(BellowMinValidators.selector);
        consensus.resignValidator();
    }

    function test_calculate_active_valitors_should_reset_min_validators() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign
        registerValidator(address(3)); // Add another validator to allow resign

        assertEq(consensus.registeredValidatorsCount(), 3);

        // Act - higher value
        consensus.calculateActiveValidators(5);

        // Test
        vm.startPrank(addr);
        vm.expectRevert(BellowMinValidators.selector);
        consensus.resignValidator();
        vm.stopPrank();

        // Act - same value
        consensus.calculateActiveValidators(3);

        // Test
        vm.startPrank(addr);
        vm.expectRevert(BellowMinValidators.selector);
        consensus.resignValidator();
        vm.stopPrank();

        // Act - bellow registered valdiators
        consensus.calculateActiveValidators(2);

        // Test
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorResigned(addr);
        consensus.resignValidator();

        vm.startPrank(address(2));
        vm.expectRevert(BellowMinValidators.selector);
        consensus.resignValidator();
    }
}
