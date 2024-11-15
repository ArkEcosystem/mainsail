// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {
    ConsensusV1,
    ValidatorData,
    Validator,
    ValidatorResigned,
    ValidatorAlreadyResigned,
    CallerIsNotValidator
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

    function test_validator_resignation_pass() public {
        assertEq(consensus.registeredValidatorsCount(), 0);
        address addr = address(1);

        // Act
        vm.startPrank(addr);
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

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorResigned(addr);
        consensus.resignValidator();
        vm.stopPrank();

        assertEq(consensus.registeredValidatorsCount(), 1);
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
        vm.startPrank(addr);
        consensus.registerValidator(prepareBLSKey(addr));
        vm.stopPrank();

        // Assert
        assertEq(consensus.registeredValidatorsCount(), 1);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ValidatorResigned(addr);
        consensus.resignValidator();

        vm.expectRevert(ValidatorAlreadyResigned.selector);
        consensus.resignValidator();
    }
}
