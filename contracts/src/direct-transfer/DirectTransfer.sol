// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

contract DirectTransfer {
	// Function to send Ether directly from the sender to the recipient
	function sendEther(address payable _to) public payable {
		require(msg.value > 0, "Must send some Ether");
		require(_to != address(0), "Invalid recipient address");

		// Transfer the Ether from the sender to the recipient
		(bool sent, ) = _to.call{value: msg.value}("");
		require(sent, "Failed to send Ether");
	}

	function batchSendEther(address payable[] calldata recipients, uint[] calldata amounts) public payable {
		require(recipients.length == amounts.length, "Mismatched recipients and amounts");

		uint total = 0;

		// Calculate the total amount to send
		for (uint i = 0; i < amounts.length; i++) {
			total += amounts[i];
		}

		// Ensure the sender has sent enough Ether
		require(msg.value >= total, "Insufficient Ether provided");

		// Transfer Ether to each recipient
		for (uint i = 0; i < recipients.length; i++) {
			require(recipients[i] != address(0), "Invalid recipient address");

			// Transfer the specified amount to each recipient
			(bool sent, ) = recipients[i].call{value: amounts[i]}("");
			require(sent, "Failed to send Ether");
		}

		// If extra Ether was sent, refund it to the sender
		uint remainingBalance = msg.value - total;
		if (remainingBalance > 0) {
			(bool refunded, ) = msg.sender.call{value: remainingBalance}("");
			require(refunded, "Failed to refund excess Ether");
		}
	}

	function balanceOf(address addr) public view returns (uint) {
		return addr.balance;
	}
}
