// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {ConsensusV1} from "@contracts/consensus/ConsensusV1.sol";
import {Base} from "./Base.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RejectingRefund {
    receive() external payable {
        revert("I reject Ether");
    }

    function callResignValidator(ConsensusV1 target) external {
        target.resignValidator(); // this will fail
    }
}

contract ConsensusTest is Base {
    function test_validator_resignation_pass_with_default_fee() public {
        assertEq(consensus.validatorsCount(), 0);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);

        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign

        // Assert
        assertEq(consensus.validatorsCount(), 2);
        assertEq(consensus.activeValidatorsCount(), 2);
        assertEq(consensus.resignedValidatorsCount(), 0);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, false);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorResigned(addr);
        consensus.resignValidator();
        vm.stopPrank();

        assertEq(consensus.validatorsCount(), 2);
        assertEq(consensus.activeValidatorsCount(), 1);
        assertEq(consensus.resignedValidatorsCount(), 1);
        validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.isResigned, true);
    }

    function test_validator_resignation_pass_with_adjusted_fee() public {
        assertEq(consensus.validatorsCount(), 0);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);

        // Set a custom fee for validator registration
        uint128 customFee = 40 ether;
        consensus.setFee(customFee);

        address payable addr = payable(address(1));
        vm.deal(addr, 100 ether);

        address payable addr2 = payable(address(2));
        vm.deal(addr2, 100 ether);

        // Act
        vm.startPrank(addr2);
        consensus.registerValidator{value: customFee}(prepareBLSKey(addr2)); // Add another validator to allow resign
        vm.startPrank(addr);
        consensus.registerValidator{value: customFee}(prepareBLSKey(addr));
        vm.stopPrank();

        // Assert
        assertEq(consensus.validatorsCount(), 2);
        assertEq(consensus.activeValidatorsCount(), 2);
        assertEq(consensus.resignedValidatorsCount(), 0);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.fee, customFee);
        assertEq(validator.data.isResigned, false);
        assertEq(addr.balance, 60 ether);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorResigned(addr);
        consensus.resignValidator();
        vm.stopPrank();

        assertEq(consensus.validatorsCount(), 2);
        assertEq(consensus.activeValidatorsCount(), 1);
        assertEq(consensus.resignedValidatorsCount(), 1);
        validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.fee, customFee); // Fee does not get reset
        assertEq(validator.data.isResigned, true);
        assertEq(addr.balance, 100 ether);
    }

    function test_validator_resignation_revert_if_receiver_rejected_fee_return() public {
        assertEq(consensus.validatorsCount(), 0);
        assertEq(consensus.activeValidatorsCount(), 0);
        assertEq(consensus.resignedValidatorsCount(), 0);

        // Set a custom fee for validator registration
        uint128 customFee = 40 ether;
        consensus.setFee(customFee);

        address payable addr = payable(new RejectingRefund());
        vm.deal(addr, 100 ether);

        address payable addr2 = payable(address(2));
        vm.deal(addr2, 100 ether);

        // Act
        vm.startPrank(addr2);
        consensus.registerValidator{value: customFee}(prepareBLSKey(addr2)); // Add another validator to allow resign
        vm.startPrank(addr);
        consensus.registerValidator{value: customFee}(prepareBLSKey(addr));
        vm.stopPrank();

        // Assert
        assertEq(consensus.validatorsCount(), 2);
        assertEq(consensus.activeValidatorsCount(), 2);
        assertEq(consensus.resignedValidatorsCount(), 0);
        ConsensusV1.Validator memory validator = consensus.getValidator(addr);
        assertEq(validator.addr, addr);
        assertEq(validator.data.blsPublicKey, prepareBLSKey(addr));
        assertEq(validator.data.voteBalance, 0);
        assertEq(validator.data.votersCount, 0);
        assertEq(validator.data.fee, customFee);
        assertEq(validator.data.isResigned, false);
        assertEq(addr.balance, 60 ether);

        vm.startPrank(addr);
        vm.expectRevert(ConsensusV1.RefundFailed.selector);
        consensus.resignValidator();
    }

    function test_validator_resignation_revert_if_caller_is_not_validator() public {
        vm.expectRevert(ConsensusV1.CallerIsNotValidator.selector);
        consensus.resignValidator();
    }

    function test_validator_resignation_revert_if_resigned() public {
        assertEq(consensus.validatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign

        // Assert
        assertEq(consensus.validatorsCount(), 2);

        // Act
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorResigned(addr);
        consensus.resignValidator();

        vm.expectRevert(ConsensusV1.ValidatorAlreadyResigned.selector);
        consensus.resignValidator();
    }

    function test_validator_resignation_revert_if_below_min_validators() public {
        assertEq(consensus.validatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);

        // Assert
        assertEq(consensus.validatorsCount(), 1);

        // Act
        vm.startPrank(addr);
        vm.expectRevert(ConsensusV1.BellowMinValidators.selector);
        consensus.resignValidator();
    }

    function test_calculate_active_validators_should_reset_min_validators() public {
        assertEq(consensus.validatorsCount(), 0);
        address addr = address(1);

        // Act
        registerValidator(addr);
        registerValidator(address(2)); // Add another validator to allow resign
        registerValidator(address(3)); // Add another validator to allow resign

        assertEq(consensus.validatorsCount(), 3);

        // Act - higher value
        consensus.calculateRoundValidators(5);

        // Test
        vm.startPrank(addr);
        vm.expectRevert(ConsensusV1.BellowMinValidators.selector);
        consensus.resignValidator();
        vm.stopPrank();

        // Act - same value
        consensus.calculateRoundValidators(3);

        // Test
        vm.startPrank(addr);
        vm.expectRevert(ConsensusV1.BellowMinValidators.selector);
        consensus.resignValidator();
        vm.stopPrank();

        // Act - bellow registered valdiators
        consensus.calculateRoundValidators(2);

        // Test
        vm.startPrank(addr);
        vm.expectEmit(address(consensus));
        emit ConsensusV1.ValidatorResigned(addr);
        consensus.resignValidator();

        vm.startPrank(address(2));
        vm.expectRevert(ConsensusV1.BellowMinValidators.selector);
        consensus.resignValidator();
    }
}
