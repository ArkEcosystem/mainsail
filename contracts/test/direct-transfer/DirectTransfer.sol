// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {DirectTransfer} from "@contracts/direct-transfer/DirectTransfer.sol";

contract DirectTransferTest is Test {
	DirectTransfer public directTransfer;

	function setUp() public {
		directTransfer = new DirectTransfer();
	}

	function test_balanceOf() public {
		vm.deal(address(0x1), 100 ether);
		vm.startPrank(address(0x1));

		assertEq(directTransfer.balanceOf(address(0x1)), 100 ether);
	}

	function testDirectSendEther() public {
		address payable recipient = payable(address(0x123));

		// Give the sender 2 Ether
		vm.deal(address(this), 100 ether);
		assertEq(directTransfer.balanceOf(address(this)), 100 ether);

		// Ensure recipient starts with 0 balance
		assertEq(recipient.balance, 0);

		// Send 1 Ether to recipient using the contract's method
		directTransfer.sendEther{value: 40 ether}(recipient);

		// Check that recipient received the Ether
		assertEq(recipient.balance, 40 ether);
		assertEq(directTransfer.balanceOf(address(this)), 60 ether);
	}

	function testDirectBatchSendEther() public {
		address payable recipient = payable(address(0x123));

		// Give the sender 2 Ether
		vm.deal(address(this), 100 ether);
		assertEq(directTransfer.balanceOf(address(this)), 100 ether);

		// Ensure recipient starts with 0 balance
		assertEq(recipient.balance, 0);

		// Create dynamically-sized arrays
		address payable[] memory recipients = new address payable[](2);
		recipients[0] = payable(address(0x123));
		recipients[1] = payable(address(0x123));

		uint[] memory amounts = new uint[](2);
		amounts[0] = 20 ether;
		amounts[1] = 20 ether;

		// Send 1 Ether to recipient using the contract's method
		directTransfer.batchSendEther{value: 40 ether}(recipients, amounts);

		// Check that recipient received the Ether
		assertEq(recipient.balance, 40 ether);
		assertEq(directTransfer.balanceOf(address(this)), 60 ether);
	}
}
