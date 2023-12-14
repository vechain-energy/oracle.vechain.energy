const { ethers } = require('hardhat')
const Web3EthAbi = require('web3-eth-abi')
const ERC1967Proxy = require('@openzeppelin/contracts/build/contracts/ERC1967Proxy.json')

async function bootSystem() {
    const [owner, upgrader, anon, reporter, user1, user2, user3] = await ethers.getSigners()
    const users = { owner, upgrader, anon, reporter, user1, user2, user3 }

    const OracleGasOptimized = await ethers.getContractFactory("OracleGasOptimized")
    const contracts = {
        oracleV1: await getContractWithProxy('OracleUpgradeable'),
        oracleV2: await OracleGasOptimized.deploy()
    }

    await contracts.oracleV2.updateReporter(reporter.address)

    await grantUserRole(users.upgrader.address, 'UPGRADER_ROLE')
    await grantUserRole(users.reporter.address, 'REPORTER_ROLE')

    return { contracts, users }

    async function grantUserRole(address, roleName) {
        const roleId = await contracts.oracleV1[roleName]()
        await contracts.oracleV1.grantRole(roleId, address)
    }
}

describe('Oracle', () => {
    describe.each([
        ['oracleV1'],
        ['oracleV2']
    ])('Oracle Contract "%s"', (oracleContract) => {
        describe('getLatestValue(id)', () => {
            it('returns (value, updatedAt)', async() => {
                const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
                const { contracts, users } = await bootSystem()
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData)
                const result = await contracts[oracleContract].getLatestValue(tokenData[0])

                await expect(Number(result[0])).toEqual(Number(tokenData[1]))
                await expect(Number(result[1])).toEqual(Number(tokenData[2]))
            })
        })

        describe('updateValue(id, newValue, newTimestamp)', () => {
            it('rejects non-reporter calls', async() => {
                const { contracts, users } = await bootSystem()
                await expect(contracts[oracleContract].connect(users.anon).updateValue(ethers.utils.formatBytes32String(""), 0, 0)).rejects.toThrow()
            })

            it('stores input correctly', async() => {
                const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
                const { contracts, users } = await bootSystem()
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData)
                const result = await contracts[oracleContract].getLatestValue(tokenData[0])

                await expect(Number(result[0])).toEqual(Number(tokenData[1]))
                await expect(Number(result[1])).toEqual(Number(tokenData[2]))
            })

            it('accepts multiple ids', async() => {
                const tokenData1 = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
                const tokenData2 = [ethers.utils.formatBytes32String("test2"), BigInt(4), BigInt(5)]

                const { contracts, users } = await bootSystem()
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData1)
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData2)

                const result1 = await contracts[oracleContract].getLatestValue(tokenData1[0])
                await expect(Number(result1[0])).toEqual(Number(tokenData1[1]))
                await expect(Number(result1[1])).toEqual(Number(tokenData1[2]))

                const result2 = await contracts[oracleContract].getLatestValue(tokenData2[0])
                await expect(Number(result2[0])).toEqual(Number(tokenData2[1]))
                await expect(Number(result2[1])).toEqual(Number(tokenData2[2]))
            })

            it('updates values correctly', async() => {
                const tokenDataBefore = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(2)]
                const tokenDataAfter = [ethers.utils.formatBytes32String("test"), BigInt(10), BigInt(20)]

                const { contracts, users } = await bootSystem()
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenDataBefore)
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenDataAfter)
                const result = await contracts[oracleContract].getLatestValue(tokenDataBefore[0])

                await expect(Number(result[0])).toEqual(Number(tokenDataAfter[1]))
                await expect(Number(result[1])).toEqual(Number(tokenDataAfter[2]))
            })

            it('emits ValueUpdate(bytes32 id, uint256 value, uint64 updatedAt)', async() => {
                const tokenData = [ethers.utils.formatBytes32String("vet-usd"), BigInt(999999999), BigInt(666666)]

                const { contracts, users } = await bootSystem()

                const tx = await (await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData)).wait()
                const event = tx.events.find(({ event }) => event === 'ValueUpdate')

                await expect(event.args.id).toEqual(tokenData[0])
                await expect(Number(event.args.value)).toEqual(Number(tokenData[1]))
                await expect(Number(event.args.updatedAt)).toEqual(Number(tokenData[2]))
            })
        })



        describe('updateValueWithProof(message, extraData, signedFor)', () => {
            const testSigner = {
                address: '0x09425C56F3c24E72dFa3E15f007435eb048b6c61',
                privateKey: '0x4c764fa090cf8cc7a90b62881202f94aaaca380bb17d13925d1e84ae0f1d99af'
            }

            it('stores input correctly', async() => {
                const { contracts, users } = await bootSystem()
                const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]

                const data = signCcipRequestWith({
                    sender: testSigner.address,
                    validUntil: Math.ceil(Date.now() / 1000) + 1800,
                    callData: tokenData[0],

                    feedId: tokenData[0],
                    value: tokenData[1],
                    updatedAt: tokenData[2]
                }, testSigner.privateKey)

                if (oracleContract === 'oracleV2') {
                    await await contracts[oracleContract].connect(users.reporter).updateReporter(testSigner.address)
                } else {
                    await contracts[oracleContract].connect(users.owner).grantRole(await contracts[oracleContract].REPORTER_ROLE(), testSigner.address)
                }

                await contracts[oracleContract].connect(users.anon).updateValueWithProof(data, '0x', testSigner.address)
                const result = await contracts[oracleContract].getLatestValue(tokenData[0])

                await expect(Number(result[0])).toEqual(Number(tokenData[1]))
                await expect(Number(result[1])).toEqual(Number(tokenData[2]))
            })

            it('refuses invalidly signed input', async() => {
                const { contracts, users } = await bootSystem()
                const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]

                const data = signCcipRequestWith({
                    sender: testSigner.address,
                    validUntil: Math.ceil(Date.now() / 1000) + 1800,
                    callData: tokenData[0],

                    feedId: tokenData[0],
                    value: tokenData[1],
                    updatedAt: tokenData[2]
                }, '0x5c52346d6a255eeb824d19c10fa094de1213ba7ccae66822b8b2bb652ce231a8')

                if (oracleContract === 'oracleV2') {
                    await await contracts[oracleContract].connect(users.reporter).updateReporter(testSigner.address)
                } else {
                    await contracts[oracleContract].connect(users.owner).grantRole(await contracts[oracleContract].REPORTER_ROLE(), testSigner.address)
                }


                await expect(contracts[oracleContract].connect(users.anon).updateValueWithProof(data, '0x', testSigner.address)).rejects.toThrow('Invalid signature')
            })


            it('refuses to accept older timestamps', async() => {
                const { contracts, users } = await bootSystem()

                const tokenData1 = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(4)]
                await contracts[oracleContract].connect(users.reporter).updateValue(...tokenData1)

                const tokenData2 = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
                const data = signCcipRequestWith({
                    sender: testSigner.address,
                    validUntil: Math.ceil(Date.now() / 1000) + 1800,
                    callData: tokenData2[0],

                    feedId: tokenData2[0],
                    value: tokenData2[1],
                    updatedAt: tokenData2[2]
                }, testSigner.privateKey)

                if (oracleContract === 'oracleV2') {
                    await await contracts[oracleContract].connect(users.reporter).updateReporter(testSigner.address)
                } else {
                    await contracts[oracleContract].connect(users.owner).grantRole(await contracts[oracleContract].REPORTER_ROLE(), testSigner.address)
                }


                await expect(contracts[oracleContract].connect(users.anon).updateValueWithProof(data, '0x', testSigner.address)).rejects.toThrow('Data must be newer')
            })
        })

        describe('isReporter(address)', () => {
            it('returns true if user is a current reporter for the oracle', async() => {
                const { contracts, users } = await bootSystem()
                const isReporter = await contracts[oracleContract].isReporter(users.reporter.address)
                expect(isReporter).toEqual(true)
            })

            it('returns false if the given address is not a reporter', async() => {
                const { contracts, users } = await bootSystem()
                const isReporter = await contracts[oracleContract].isReporter(users.upgrader.address)
                expect(isReporter).toEqual(false)
            })
        })

    })
})



async function getContractWithProxy(contractName) {
    // get contract details
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()

    const Proxy = await ethers.getContractFactoryFromArtifact(ERC1967Proxy)

    // calculate initialize() call during deployment
    const initializeAbi = Contract.interface.fragments.find(({ name }) => name === 'initialize')
    const callInitialize = Web3EthAbi.encodeFunctionCall(initializeAbi, [])

    // deploy proxy pointing to contract
    const proxy = await Proxy.deploy(contract.address, callInitialize)

    // return proxy address attached with contract functionality
    const proxiedContract = Contract.attach(proxy.address)
    return proxiedContract
}



function signCcipRequestWith(message, privateKey) {
    const encodedResponse = ethers.utils.defaultAbiCoder.encode(['uint128', 'uint128', 'bytes32'], [message.value, message.updatedAt, message.feedId])
    const messageHash = ethers.utils.solidityKeccak256(
        ["bytes", "address", "uint64", "bytes32", "bytes32"], [
            "0x1900",
            message.sender,
            message.validUntil,
            ethers.utils.keccak256(message.extraData || '0x'),
            ethers.utils.keccak256(encodedResponse),
        ]
    );

    // sign the message with the backends private key
    const signer = new ethers.utils.SigningKey(privateKey);
    const signature = signer.signDigest(messageHash);
    const signatureData = ethers.utils.hexConcat([signature.r, signature.s, ethers.utils.hexlify(signature.v)])

    return ethers.utils.defaultAbiCoder.encode(['bytes', 'uint64', 'bytes'], [encodedResponse, message.validUntil, signatureData])
}