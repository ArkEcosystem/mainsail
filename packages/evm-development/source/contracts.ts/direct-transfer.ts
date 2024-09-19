export const abi = {
	abi: [
		{
			inputs: [{ internalType: "address", name: "addr", type: "address" }],
			name: "balanceOf",
			outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [
				{ internalType: "address payable[]", name: "recipients", type: "address[]" },
				{ internalType: "uint256[]", name: "amounts", type: "uint256[]" },
			],
			name: "batchSendEther",
			outputs: [],
			stateMutability: "payable",
			type: "function",
		},
		{
			inputs: [{ internalType: "address payable", name: "_to", type: "address" }],
			name: "sendEther",
			outputs: [],
			stateMutability: "payable",
			type: "function",
		},
	],
	bytecode: {
		linkReferences: {},
		object: "0x6080604052348015600f57600080fd5b506106608061001f6000396000f3fe6080604052600436106100345760003560e01c806348c981e21461003957806370a082311461004e578063fea542a514610088575b600080fd5b61004c6100473660046104f1565b61009b565b005b34801561005a57600080fd5b506100766100693660046104f1565b6001600160a01b03163190565b60405190815260200160405180910390f35b61004c610096366004610561565b6101d7565b600034116100e75760405162461bcd60e51b815260206004820152601460248201527326bab9ba1039b2b7321039b7b6b29022ba3432b960611b60448201526064015b60405180910390fd5b6001600160a01b0381166101395760405162461bcd60e51b8152602060048201526019602482015278496e76616c696420726563697069656e74206164647265737360381b60448201526064016100de565b6000816001600160a01b03163460405160006040518083038185875af1925050503d8060008114610186576040519150601f19603f3d011682016040523d82523d6000602084013e61018b565b606091505b50509050806101d35760405162461bcd60e51b81526020600482015260146024820152732330b4b632b2103a379039b2b7321022ba3432b960611b60448201526064016100de565b5050565b8281146102305760405162461bcd60e51b815260206004820152602160248201527f4d69736d61746368656420726563697069656e747320616e6420616d6f756e746044820152607360f81b60648201526084016100de565b6000805b8281101561026a5783838281811061024e5761024e6105d2565b905060200201358261026091906105fe565b9150600101610234565b50803410156102bb5760405162461bcd60e51b815260206004820152601b60248201527f496e73756666696369656e742045746865722070726f7669646564000000000060448201526064016100de565b60005b848110156104225760008686838181106102da576102da6105d2565b90506020020160208101906102ef91906104f1565b6001600160a01b0316036103415760405162461bcd60e51b8152602060048201526019602482015278496e76616c696420726563697069656e74206164647265737360381b60448201526064016100de565b6000868683818110610355576103556105d2565b905060200201602081019061036a91906104f1565b6001600160a01b0316858584818110610385576103856105d2565b9050602002013560405160006040518083038185875af1925050503d80600081146103cc576040519150601f19603f3d011682016040523d82523d6000602084013e6103d1565b606091505b50509050806104195760405162461bcd60e51b81526020600482015260146024820152732330b4b632b2103a379039b2b7321022ba3432b960611b60448201526064016100de565b506001016102be565b50600061042f8234610617565b905080156104d157604051600090339083908381818185875af1925050503d8060008114610479576040519150601f19603f3d011682016040523d82523d6000602084013e61047e565b606091505b50509050806104cf5760405162461bcd60e51b815260206004820152601d60248201527f4661696c656420746f20726566756e642065786365737320457468657200000060448201526064016100de565b505b505050505050565b6001600160a01b03811681146104ee57600080fd5b50565b60006020828403121561050357600080fd5b813561050e816104d9565b9392505050565b60008083601f84011261052757600080fd5b50813567ffffffffffffffff81111561053f57600080fd5b6020830191508360208260051b850101111561055a57600080fd5b9250929050565b6000806000806040858703121561057757600080fd5b843567ffffffffffffffff81111561058e57600080fd5b61059a87828801610515565b909550935050602085013567ffffffffffffffff8111156105ba57600080fd5b6105c687828801610515565b95989497509550505050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b80820180821115610611576106116105e8565b92915050565b81810381811115610611576106116105e856fea2646970667358221220d28886eecb249ad48abd4a8b9d4d0dde63bad0f91f87238bbf483262d94d940264736f6c634300081a0033",
		sourceMap: "81:1734:26:-:0;;;;;;;;;;;;;;;;;;;",
	},
	id: 26,
	metadata: {
		compiler: { version: "0.8.26+commit.8a97fa7a" },
		language: "Solidity",
		output: {
			abi: [
				{
					inputs: [{ internalType: "address", name: "addr", type: "address" }],
					name: "balanceOf",
					outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
					stateMutability: "view",
					type: "function",
				},
				{
					inputs: [
						{ internalType: "address payable[]", name: "recipients", type: "address[]" },
						{ internalType: "uint256[]", name: "amounts", type: "uint256[]" },
					],
					name: "batchSendEther",
					stateMutability: "payable",
					type: "function",
				},
				{
					inputs: [{ internalType: "address payable", name: "_to", type: "address" }],
					name: "sendEther",
					stateMutability: "payable",
					type: "function",
				},
			],
			devdoc: { kind: "dev", methods: {}, version: 1 },
			userdoc: { kind: "user", methods: {}, version: 1 },
		},
		settings: {
			compilationTarget: { "src/DirectTransfer.sol": "DirectTransfer" },
			evmVersion: "paris",
			libraries: {},
			metadata: { bytecodeHash: "ipfs" },
			optimizer: { enabled: true, runs: 200 },
			remappings: ["forge-std/=lib/forge-std/src/"],
		},
		sources: {
			"src/DirectTransfer.sol": {
				keccak256: "0xa304a6497b142a8d631454afad2570ea1ad9d29a517ae75b6bb194641caec850",
				license: "GNU GENERAL PUBLIC LICENSE",
				urls: [
					"bzz-raw://6a1ecfb19d0392a1b2d61f1f46f53b94439e1a29e4cf3a50dc78d81113ce6f8e",
					"dweb:/ipfs/Qmb86g423EJmCEJtfzbTSZpXC9hdwMxjdz8vuuCkro5WFV",
				],
			},
		},
		version: 1,
	},
	methodIdentifiers: {
		"balanceOf(address)": "70a08231",
		"batchSendEther(address[],uint256[])": "fea542a5",
		"sendEther(address)": "48c981e2",
	},
	rawMetadata:
		'{"compiler":{"version":"0.8.26+commit.8a97fa7a"},"language":"Solidity","output":{"abi":[{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address payable[]","name":"recipients","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"batchSendEther","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address payable","name":"_to","type":"address"}],"name":"sendEther","outputs":[],"stateMutability":"payable","type":"function"}],"devdoc":{"kind":"dev","methods":{},"version":1},"userdoc":{"kind":"user","methods":{},"version":1}},"settings":{"compilationTarget":{"src/DirectTransfer.sol":"DirectTransfer"},"evmVersion":"paris","libraries":{},"metadata":{"bytecodeHash":"ipfs"},"optimizer":{"enabled":true,"runs":200},"remappings":[":forge-std/=lib/forge-std/src/"]},"sources":{"src/DirectTransfer.sol":{"keccak256":"0xa304a6497b142a8d631454afad2570ea1ad9d29a517ae75b6bb194641caec850","license":"GNU GENERAL PUBLIC LICENSE","urls":["bzz-raw://6a1ecfb19d0392a1b2d61f1f46f53b94439e1a29e4cf3a50dc78d81113ce6f8e","dweb:/ipfs/Qmb86g423EJmCEJtfzbTSZpXC9hdwMxjdz8vuuCkro5WFV"]}},"version":1}',
};
