export const abi = {
	_format: "hh-sol-artifact-1",
	abi: [
		{
			inputs: [],
			stateMutability: "nonpayable",
			type: "constructor",
		},
		{
			anonymous: false,
			inputs: [
				{
					indexed: false,
					internalType: "address",
					name: "voter",
					type: "address",
				},
				{
					indexed: false,
					internalType: "address",
					name: "validator",
					type: "address",
				},
			],
			name: "Voted",
			type: "event",
		},
		{
			inputs: [
				{
					internalType: "uint8",
					name: "n",
					type: "uint8",
				},
			],
			name: "calculateTopValidators",
			outputs: [
				{
					components: [
						{
							internalType: "address",
							name: "addr",
							type: "address",
						},
						{
							components: [
								{
									internalType: "uint256",
									name: "voteBalance",
									type: "uint256",
								},
								{
									internalType: "bool",
									name: "isResigning",
									type: "bool",
								},
								{
									internalType: "bytes",
									name: "bls12_381_public_key",
									type: "bytes",
								},
							],
							internalType: "struct ValidatorData",
							name: "data",
							type: "tuple",
						},
					],
					internalType: "struct Validator[]",
					name: "",
					type: "tuple[]",
				},
			],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [],
			name: "deregisterValidator",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "uint8",
					name: "n",
					type: "uint8",
				},
			],
			name: "getActiveValidators",
			outputs: [
				{
					components: [
						{
							internalType: "address",
							name: "addr",
							type: "address",
						},
						{
							components: [
								{
									internalType: "uint256",
									name: "voteBalance",
									type: "uint256",
								},
								{
									internalType: "bool",
									name: "isResigning",
									type: "bool",
								},
								{
									internalType: "bytes",
									name: "bls12_381_public_key",
									type: "bytes",
								},
							],
							internalType: "struct ValidatorData",
							name: "data",
							type: "tuple",
						},
					],
					internalType: "struct Validator[]",
					name: "",
					type: "tuple[]",
				},
			],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "address",
					name: "_addr",
					type: "address",
				},
			],
			name: "getValidator",
			outputs: [
				{
					components: [
						{
							internalType: "address",
							name: "addr",
							type: "address",
						},
						{
							components: [
								{
									internalType: "uint256",
									name: "voteBalance",
									type: "uint256",
								},
								{
									internalType: "bool",
									name: "isResigning",
									type: "bool",
								},
								{
									internalType: "bytes",
									name: "bls12_381_public_key",
									type: "bytes",
								},
							],
							internalType: "struct ValidatorData",
							name: "data",
							type: "tuple",
						},
					],
					internalType: "struct Validator",
					name: "",
					type: "tuple",
				},
			],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "address",
					name: "addr",
					type: "address",
				},
			],
			name: "isValidatorRegistered",
			outputs: [
				{
					internalType: "bool",
					name: "",
					type: "bool",
				},
			],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [],
			name: "performValidatorResignations",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "bytes",
					name: "bls12_381_public_key",
					type: "bytes",
				},
			],
			name: "registerValidator",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [],
			name: "registeredValidatorsCount",
			outputs: [
				{
					internalType: "uint256",
					name: "",
					type: "uint256",
				},
			],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [],
			name: "shuffle",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [],
			name: "updateActiveValidators",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [],
			name: "updateActiveValidatorsMerge",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [
				{
					components: [
						{
							internalType: "address",
							name: "addr",
							type: "address",
						},
						{
							components: [
								{
									internalType: "uint256",
									name: "voteBalance",
									type: "uint256",
								},
								{
									internalType: "bool",
									name: "isResigning",
									type: "bool",
								},
								{
									internalType: "bytes",
									name: "bls12_381_public_key",
									type: "bytes",
								},
							],
							internalType: "struct ValidatorData",
							name: "data",
							type: "tuple",
						},
					],
					internalType: "struct Validator",
					name: "_validator",
					type: "tuple",
				},
			],
			name: "updateValidator",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "address[]",
					name: "voters",
					type: "address[]",
				},
			],
			name: "updateVoters",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			inputs: [
				{
					internalType: "address",
					name: "addr",
					type: "address",
				},
			],
			name: "vote",
			outputs: [],
			stateMutability: "nonpayable",
			type: "function",
		},
		{
			anonymous: false,
			inputs: [
				{ indexed: false, internalType: "address", name: "voter", type: "address" },
				{ indexed: false, internalType: "address", name: "validator", type: "address" },
			],
			name: "Voted",
			type: "event",
		},
	],
	bytecode:
		"0x60a0604052600080556001600855348015601857600080fd5b50336080526080516126bf6100386000396000610ade01526126bf6000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c80636a911ccf1161008c5780638bc3dd9b116100665780638bc3dd9b14610122578063b5cfa68c146101a6578063d04a68c7146101b9578063f1bd0b37146101f557600080fd5b80636a911ccf146101785780636dd7d8ea146101805780637c1f669a1461019357600080fd5b80632520bf04116100c85780632520bf041461012a5780632bdf6d431461013257806348948ede14610145578063602a9eee1461016557600080fd5b80630f062c64146100ef5780631904bb2e146100f957806321eb1a9514610122575b600080fd5b6100f7610206565b005b61010c610107366004612019565b6105ef565b60405161011991906120c6565b60405180910390f35b6100f7610746565b6100f7610766565b6100f76101403660046120d9565b6108c5565b61015861015336600461214e565b61090c565b6040516101199190612171565b6100f76101733660046121d6565b610ad4565b6100f7610d60565b6100f761018e366004612019565b610e6d565b6100f76101a1366004612238565b610fe1565b6101586101b436600461214e565b61107e565b6101e56101c7366004612019565b6001600160a01b031660009081526003602052604090205460ff1690565b6040519015158152602001610119565b600054604051908152602001610119565b6009546000906001600160401b0381111561022357610223612272565b60405190808252806020026020018201604052801561024c578160200160208202803683370190505b50905060005b60095481101561041a5760006009828154811061027157610271612288565b60009182526020808320909101546001600160a01b03168083526001918290526040909220908101549192509060ff166102f25760405162461bcd60e51b815260206004820152601a60248201527f56616c696461746f72206973206e6f742072657369676e696e6700000000000060448201526064015b60405180910390fd5b60008160020160405161030591906122d8565b604051908190039020600080549192508061031f83612363565b90915550506001600160a01b0383166000908152600360209081526040808320805460ff19908116909155600192839052908320838155918201805490911690559061036e6002830182611f62565b50506000818152600260205260408120805460ff191690555b6005546103969060019061237a565b85101561040a57836001600160a01b0316600582815481106103ba576103ba612288565b6000918252602090912001546001600160a01b0316036103f857808686815181106103e7576103e7612288565b60200260200101818152505061040a565b806104028161238d565b915050610387565b5050600190920191506102529050565b5060005b81518110156104fa5760006104348260016123a6565b90505b82518110156104f15782818151811061045257610452612288565b602002602001015183838151811061046c5761046c612288565b602002602001015110156104e95782818151811061048c5761048c612288565b60200260200101518383815181106104a6576104a6612288565b60200260200101518484815181106104c0576104c0612288565b602002602001018584815181106104d9576104d9612288565b6020908102919091010191909152525b600101610437565b5060010161041e565b5060005b81518110156105df57600082828151811061051b5761051b612288565b6020026020010151905060056001600580549050610539919061237a565b8154811061054957610549612288565b600091825260209091200154600580546001600160a01b03909216918390811061057557610575612288565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b0316021790555060058054806105b4576105b46123b9565b600082815260209020810160001990810180546001600160a01b0319169055019055506001016104fe565b506105ec60096000611f9c565b50565b6105f7611fba565b6001600160a01b03821660009081526003602052604090205460ff1661065f5760405162461bcd60e51b815260206004820152601c60248201527f56616c696461746f724461746120646f65736e2774206578697374730000000060448201526064016102e9565b6040805180820182526001600160a01b038416808252600090815260016020818152918490208451606081018652815481529181015460ff1615158284015260028101805494959386019492939192918401916106bb9061229e565b80601f01602080910402602001604051908101604052809291908181526020018280546106e79061229e565b80156107345780601f1061070957610100808354040283529160200191610734565b820191906000526020600020905b81548152906001019060200180831161071757829003601f168201915b50505091909252505050905292915050565b61076460056000600160058054905061075f919061237a565b6114bb565b565b600554600061077660018361237a565b90505b80156108c157600061078c8260016123a6565b604080514260208201524491810191909152606081018490526080016040516020818303038152906040528051906020012060001c6107cb91906123e5565b90506000600583815481106107e2576107e2612288565b600091825260209091200154600580546001600160a01b039092169250908390811061081057610810612288565b600091825260209091200154600580546001600160a01b03909216918590811061083c5761083c612288565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b03160217905550806005838154811061087e5761087e612288565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b03160217905550505080806108b990612363565b915050610779565b5050565b60005b81811015610907576108ff8383838181106108e5576108e5612288565b90506020020160208101906108fa9190612019565b611519565b6001016108c8565b505050565b606060006109248360ff1660006005805490506115f6565b905060008160ff166001600160401b0381111561094357610943612272565b60405190808252806020026020018201604052801561097c57816020015b610969611fba565b8152602001906001900390816109615790505b50905060005b8260ff16811015610acc576000600582815481106109a2576109a2612288565b6000918252602090912001546001600160a01b03169050806109c357600080fd5b6001600160a01b038116600081815260016020818152604092839020835180850185529485528351606081018552815481529281015460ff16151583830152600281018054919594928501939286929084019190610a209061229e565b80601f0160208091040260200160405190810160405280929190818152602001828054610a4c9061229e565b8015610a995780601f10610a6e57610100808354040283529160200191610a99565b820191906000526020600020905b815481529060010190602001808311610a7c57829003601f168201915b505050505081525050815250848481518110610ab757610ab7612288565b60209081029190910101525050600101610982565b509392505050565b6001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000163303610b3d5760405162461bcd60e51b815260206004820152600e60248201526d24b73b30b634b21031b0b63632b960911b60448201526064016102e9565b3360009081526003602052604090205460ff1615610ba95760405162461bcd60e51b815260206004820152602360248201527f56616c696461746f724461746120697320616c726561647920726567697374656044820152621c995960ea1b60648201526084016102e9565b60008282604051610bbb9291906123f9565b604080519182900390912060008181526002602052919091205490915060ff1615610c345760405162461bcd60e51b815260206004820152602360248201527f424c5331322d333831206b657920697320616c726561647920726567697374656044820152621c995960ea1b60648201526084016102e9565b610c3e8383611688565b600060405180606001604052806000815260200160001515815260200185858080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201829052509390945250508054929350905080610ca48361238d565b90915550503360009081526003602090815260408083208054600160ff199182168117909255818452938290208551815592850151908301805490941690151517909255908201518291906002820190610cfe9082612457565b505050600091825250600260205260408120805460ff191660019081179091556005805491820181559091527f036b6384b5eca791c62761152d0c79bb0604c104a5fb6f4eb0703f3154bb3db00180546001600160a01b031916331790555050565b3360009081526003602052604090205460ff16610db85760405162461bcd60e51b815260206004820152601660248201527521b0b63632b9103737ba1030903b30b634b230ba37b960511b60448201526064016102e9565b3360009081526001602081905260409091209081015460ff1615610e1e5760405162461bcd60e51b815260206004820152601e60248201527f56616c696461746f7220697320616c72656164792072657369676e696e67000060448201526064016102e9565b6001908101805460ff1916821790556009805491820181556000527f6e1540171b6c0c960b71a7020d9f60077f6af931a8bbf590da0223dacf75c7af0180546001600160a01b03191633179055565b6001600160a01b03811660009081526003602052604090205460ff16610ed55760405162461bcd60e51b815260206004820152601760248201527f6d75737420766f746520666f722076616c696461746f7200000000000000000060448201526064016102e9565b336000908152600460205260409020546001600160a01b031615610f315760405162461bcd60e51b81526020600482015260136024820152721513d113ce88185b1c9958591e481d9bdd1959606a1b60448201526064016102e9565b6040805180820182526001600160a01b038381168083523380316020808601918252600083815260048252878120965187546001600160a01b0319169616959095178655905160019586015591835292905291822080549131929091610f989084906123a6565b9091555050604080513381526001600160a01b03831660208201527fce0c7a2a940807f7dc2ce7a615c2532e915e6c0ac9a08bc4ed9d515a710a53e2910160405180910390a150565b610ff16101c76020830183612019565b61103d5760405162461bcd60e51b815260206004820152601c60248201527f56616c696461746f724461746120646f65736e2774206578697374730000000060448201526064016102e9565b61104a6020820182612515565b6001600061105b6020850185612019565b6001600160a01b03168152602081019190915260400160002061090782826125f4565b6060600560008154811061109457611094612288565b6000918252602082200154600680546001600160a01b0319166001600160a01b039092169190911790556005546110d19060ff85169083906115f6565b905060015b600554811015611312576000600582815481106110f5576110f5612288565b6000918252602090912001546008546001600160a01b03909116915060ff8416111561112a57611124816116e6565b5061130a565b6001600160a01b038082166000818152600160208181526040808420600654909616845292839020835180850185529485528351606081018552865481529286015460ff1615158383015260028601805491956112f89590949385019392889291840191906111989061229e565b80601f01602080910402602001604051908101604052809291908181526020018280546111c49061229e565b80156112115780601f106111e657610100808354040283529160200191611211565b820191906000526020600020905b8154815290600101906020018083116111f457829003601f168201915b5050509190925250505090526040805180820182526006546001600160a01b03168152815160608101835285548152600186015460ff16151560208281019190915260028701805493949185019388928401919061126e9061229e565b80601f016020809104026020016040519081016040528092919081815260200182805461129a9061229e565b80156112e75780601f106112bc576101008083540402835291602001916112e7565b820191906000526020600020905b8154815290600101906020018083116112ca57829003601f168201915b505050505081525050815250611a22565b1561130657611306836116e6565b5050505b6001016110d6565b5060008160ff166001600160401b0381111561133057611330612272565b60405190808252806020026020018201604052801561136957816020015b611356611fba565b81526020019060019003908161134e5790505b506006549091506001600160a01b031660005b8360ff168110156114b1576001600160a01b038216600081815260016020818152604092839020835180850185529485528351606081018552815481529281015460ff161515838301526002810180549195949285019392869290840191906113e49061229e565b80601f01602080910402602001604051908101604052809291908181526020018280546114109061229e565b801561145d5780601f106114325761010080835404028352916020019161145d565b820191906000526020600020905b81548152906001019060200180831161144057829003601f168201915b50505050508152505081525084838151811061147b5761147b612288565b6020908102919091018101919091526001600160a01b03938416600090815260079091526040902054909216915060010161137c565b5090949350505050565b8082101561090757600060026114d1848461237a565b6114db9190612675565b6114e590846123a6565b90506114f28484836114bb565b611507846115018360016123a6565b846114bb565b61151384848385611a64565b50505050565b6001600160a01b038082166000908152600460205260409020805490911661153f575050565b60018101546001600160a01b0383163181101561159e5761156a816001600160a01b0385163161237a565b82546001600160a01b0316600090815260016020526040812080549091906115939084906123a6565b909155506115e19050565b6115b26001600160a01b038416318261237a565b82546001600160a01b0316600090815260016020526040812080549091906115db90849061237a565b90915550505b506001600160a01b0390911631600190910155565b6000818311156116605760405162461bcd60e51b815260206004820152602f60248201527f4d696e696d756d2073686f756c64206265206c657373207468616e206f72206560448201526e7175616c20746f206d6178696d756d60881b60648201526084016102e9565b8284101561166f575081611681565b8184111561167e575080611681565b50825b9392505050565b603081146108c15760405162461bcd60e51b815260206004820152602560248201527f424c5331322d333831207075626c69634b6579206c656e67746820697320696e6044820152641d985b1a5960da1b60648201526084016102e9565b6006546040805180820182526001600160a01b03848116808352600090815260016020818152918590208551606081018752815481529181015460ff16151582840152600281018054949097169661182e9693860194929391929184019161174d9061229e565b80601f01602080910402602001604051908101604052809291908181526020018280546117799061229e565b80156117c65780601f1061179b576101008083540402835291602001916117c6565b820191906000526020600020905b8154815290600101906020018083116117a957829003601f168201915b5050509190925250505090526040805180820182526001600160a01b038516808252600090815260016020818152918490208451606081018652815481529181015460ff16151582840152600281018054949593860194929391929184019161126e9061229e565b6118405761183b82611eb1565b6119cc565b805b6001600160a01b03821661185f5761185a8184611f03565b6119ca565b6040805180820182526001600160a01b038516808252600090815260016020818152918490208451606081018652815481529181015460ff1615158284015260028101805461199a9694860194840191906118b99061229e565b80601f01602080910402602001604051908101604052809291908181526020018280546118e59061229e565b80156119325780601f1061190757610100808354040283529160200191611932565b820191906000526020600020905b81548152906001019060200180831161191557829003601f168201915b5050509190925250505090526040805180820182526001600160a01b038616808252600090815260016020818152918490208451606081018652815481529181015460ff16151582840152600281018054949593860194929391929184019161126e9061229e565b6119a85761185a8184611f03565b506001600160a01b038082166000908152600760205260409020541690611842565b505b603560085411156108c157600680546001600160a01b038082166000908152600760205260408120549091166001600160a01b03199092168217909255600880549192611a1883612363565b9190505550505050565b6020808201515190830151516000919003611a4f5750805182516001600160a01b03918216911611611a5e565b50602080820151519083015151115b92915050565b6000611a70848461237a565b611a7b9060016123a6565b90506000611a89848461237a565b90506000826001600160401b03811115611aa557611aa5612272565b604051908082528060200260200182016040528015611ace578160200160208202803683370190505b5090506000826001600160401b03811115611aeb57611aeb612272565b604051908082528060200260200182016040528015611b14578160200160208202803683370190505b50905060005b84811015611b8d5788611b2d828a6123a6565b81548110611b3d57611b3d612288565b9060005260206000200160009054906101000a90046001600160a01b0316838281518110611b6d57611b6d612288565b6001600160a01b0390921660209283029190910190910152600101611b1a565b5060005b83811015611c10578881611ba68960016123a6565b611bb091906123a6565b81548110611bc057611bc0612288565b9060005260206000200160009054906101000a90046001600160a01b0316828281518110611bf057611bf0612288565b6001600160a01b0390921660209283029190910190910152600101611b91565b50600080885b8683108015611c2457508582105b15611daa576000858481518110611c3d57611c3d612288565b602002602001015190506000858481518110611c5b57611c5b612288565b6020908102919091018101516040805180820182526001600160a01b03861680825260009081526001808652908390208351606081018552815481529181015460ff16151582870152600281018054959750611cc7969395938601949293919284019161174d9061229e565b15611d3357868581518110611cde57611cde612288565b60200260200101518d8481548110611cf857611cf8612288565b600091825260209091200180546001600160a01b0319166001600160a01b039290921691909117905584611d2b8161238d565b955050611d96565b858481518110611d4557611d45612288565b60200260200101518d8481548110611d5f57611d5f612288565b600091825260209091200180546001600160a01b0319166001600160a01b039290921691909117905583611d928161238d565b9450505b82611da08161238d565b9350505050611c16565b86831015611e2757848381518110611dc457611dc4612288565b60200260200101518b8281548110611dde57611dde612288565b600091825260209091200180546001600160a01b0319166001600160a01b039290921691909117905582611e118161238d565b9350508080611e1f9061238d565b915050611daa565b85821015611ea457838281518110611e4157611e41612288565b60200260200101518b8281548110611e5b57611e5b612288565b600091825260209091200180546001600160a01b0319166001600160a01b039290921691909117905581611e8e8161238d565b9250508080611e9c9061238d565b915050611e27565b5050505050505050505050565b600680546001600160a01b0383811660008181526007602052604081208054939094166001600160a01b0319938416179093558354909116179091556008805491611efb8361238d565b919050555050565b6001600160a01b0382811660008181526007602052604080822080548686168085529284208054919096166001600160a01b031991821617909555928252825490931690921790556008805491611f598361238d565b91905055505050565b508054611f6e9061229e565b6000825580601f10611f7e575050565b601f0160209004906000526020600020908101906105ec9190612000565b50805460008255906000526020600020908101906105ec9190612000565b604051806040016040528060006001600160a01b03168152602001611ffb604051806060016040528060008152602001600015158152602001606081525090565b905290565b5b808211156120155760008155600101612001565b5090565b60006020828403121561202b57600080fd5b81356001600160a01b038116811461168157600080fd5b60018060a01b038151168252600060208201516040602085015280516040850152602081015115156060850152604081015190506060608085015280518060a086015260005b818110156120a557602081840181015160c0888401015201612088565b50600060c0828701015260c0601f19601f8301168601019250505092915050565b6020815260006116816020830184612042565b600080602083850312156120ec57600080fd5b82356001600160401b0381111561210257600080fd5b8301601f8101851361211357600080fd5b80356001600160401b0381111561212957600080fd5b8560208260051b840101111561213e57600080fd5b6020919091019590945092505050565b60006020828403121561216057600080fd5b813560ff8116811461168157600080fd5b6000602082016020835280845180835260408501915060408160051b86010192506020860160005b828110156121ca57603f198786030184526121b5858351612042565b94506020938401939190910190600101612199565b50929695505050505050565b600080602083850312156121e957600080fd5b82356001600160401b038111156121ff57600080fd5b8301601f8101851361221057600080fd5b80356001600160401b0381111561222657600080fd5b85602082840101111561213e57600080fd5b60006020828403121561224a57600080fd5b81356001600160401b0381111561226057600080fd5b82016040818503121561168157600080fd5b634e487b7160e01b600052604160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b600181811c908216806122b257607f821691505b6020821081036122d257634e487b7160e01b600052602260045260246000fd5b50919050565b60008083546122e68161229e565b6001821680156122fd576001811461231257612342565b60ff1983168652811515820286019350612342565b86600052602060002060005b8381101561233a5781548882015260019091019060200161231e565b505081860193505b509195945050505050565b634e487b7160e01b600052601160045260246000fd5b6000816123725761237261234d565b506000190190565b81810381811115611a5e57611a5e61234d565b60006001820161239f5761239f61234d565b5060010190565b80820180821115611a5e57611a5e61234d565b634e487b7160e01b600052603160045260246000fd5b634e487b7160e01b600052601260045260246000fd5b6000826123f4576123f46123cf565b500690565b8183823760009101908152919050565b601f82111561090757806000526020600020601f840160051c810160208510156124305750805b601f840160051c820191505b81811015612450576000815560010161243c565b5050505050565b81516001600160401b0381111561247057612470612272565b6124848161247e845461229e565b84612409565b6020601f8211600181146124b857600083156124a05750848201515b600019600385901b1c1916600184901b178455612450565b600084815260208120601f198516915b828110156124e857878501518255602094850194600190920191016124c8565b50848210156125065786840151600019600387901b60f8161c191681555b50505050600190811b01905550565b60008235605e1983360301811261252b57600080fd5b9190910192915050565b6001600160401b0383111561254c5761254c612272565b6125608361255a835461229e565b83612409565b6000601f841160018114612594576000851561257c5750838201355b600019600387901b1c1916600186901b178355612450565b600083815260209020601f19861690835b828110156125c557868501358255602094850194600190920191016125a5565b50868210156125e25760001960f88860031b161c19848701351681555b505060018560011b0183555050505050565b8135815560018101602083013580151580821461261057600080fd5b60ff19835416915060ff8116821783555050506040820135601e1983360301811261263a57600080fd5b820180356001600160401b0381111561265257600080fd5b60208201915080360382131561266757600080fd5b611513818360028601612535565b600082612684576126846123cf565b50049056fea26469706673582212205be07e74f4d28e5c7333d55c306e00656f344ec456738308762ab2978086c26664736f6c634300081a0033",
};
