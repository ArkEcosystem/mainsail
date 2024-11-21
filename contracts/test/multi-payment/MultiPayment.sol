// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {MultiPayment} from "@contracts/multi-payment/MultiPayment.sol";

contract MultiPaymentTest is Test {
    MultiPayment public multiPayment;

    function setUp() public {
        multiPayment = new MultiPayment();
    }

    function test_pay_pass_with_single_payment() public {
        address payable sender = payable(address(this));
        vm.deal(sender, 100 ether);
        assertEq(sender.balance, 100 ether);

        address payable recipient = payable(address(1));
        assertEq(recipient.balance, 0);

        address payable[] memory recipients = new address payable[](1);
        recipients[0] = recipient;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 40 ether;

        // Send 1 Ether to recipient using the contract's method
        multiPayment.pay{value: 40 ether}(recipients, amounts);

        // Check that recipient received the Ether
        assertEq(recipient.balance, 40 ether);
        assertEq(sender.balance, 60 ether);
    }

    function test_pay_pass_with_multiple_payments() public {
        address payable sender = payable(address(this));
        vm.deal(sender, 100 ether);
        assertEq(sender.balance, 100 ether);

        address payable recipient1 = payable(address(1));
        assertEq(recipient1.balance, 0);
        address payable recipient2 = payable(address(2));
        assertEq(recipient2.balance, 0);
        address payable recipient3 = payable(address(3));
        assertEq(recipient2.balance, 0);

        address payable[] memory recipients = new address payable[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient2;
        recipients[2] = recipient3;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 10 ether;
        amounts[1] = 20 ether;
        amounts[2] = 30 ether;

        // Send 1 Ether to recipient using the contract's method
        multiPayment.pay{value: 60 ether}(recipients, amounts);

        // Check that recipient received the Ether
        assertEq(recipient1.balance, 10 ether);
        assertEq(recipient2.balance, 20 ether);
        assertEq(recipient3.balance, 30 ether);
        assertEq(sender.balance, 40 ether);
    }

    function test_pay_pass_with_multiple_payments_same_address() public {
        address payable sender = payable(address(this));
        vm.deal(sender, 100 ether);
        assertEq(sender.balance, 100 ether);

        address payable recipient1 = payable(address(1));
        assertEq(recipient1.balance, 0);

        address payable[] memory recipients = new address payable[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient1;
        recipients[2] = recipient1;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 10 ether;
        amounts[1] = 20 ether;
        amounts[2] = 30 ether;

        // Send 1 Ether to recipient using the contract's method
        multiPayment.pay{value: 60 ether}(recipients, amounts);

        // Check that recipient received the Ether
        assertEq(recipient1.balance, 60 ether);
        assertEq(sender.balance, 40 ether);
    }

    function test_pay_pass_with_multiple_payments_large() public {
        uint256 payments = 10000;
        address payable[] memory recipients = new address payable[](payments);
        uint256[] memory amounts = new uint256[](payments);

        uint256 total = 0;
        for (uint256 i = 0; i < payments; i++) {
            recipients[i] = payable(address(uint160(i + 10))); // For some reason address(9) reverts // TODO: Check why
            amounts[i] = 1;
            total += 1;
        }

        address payable sender = payable(address(this));
        vm.deal(sender, total);

        multiPayment.pay{value: total}(recipients, amounts);
        assertEq(sender.balance, 0);

        for (uint256 i = 0; i < payments; i++) {
            assertEq(recipients[i].balance, 1);
        }
    }
}
