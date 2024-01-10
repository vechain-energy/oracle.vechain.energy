const { ethers } = require('hardhat')
const Web3EthAbi = require('web3-eth-abi')
const ERC1967Proxy = require('@openzeppelin/contracts/build/contracts/ERC1967Proxy.json')

async function bootSystem() {
    const [owner, upgrader, anon, admin, reporter, user1, user2, user3] = await ethers.getSigners()
    const users = { owner, admin, upgrader, anon, reporter, user1, user2, user3 }

    const OracleGasOptimized = await ethers.getContractFactory("OracleGasOptimized")
    const contracts = {
        aggregator: await getContractWithProxy('OracleAggregatorUpgradable'),
        oracleV1: await getContractWithProxy('OracleUpgradable'),
        oracleV2: await OracleGasOptimized.deploy()
    }

    await contracts.oracleV2.updateReporter(reporter.address)

    await grantUserRole(users.upgrader.address, 'UPGRADER_ROLE')
    await grantUserRole(users.reporter.address, 'REPORTER_ROLE')

    const adminRoleId = await contracts.aggregator.ADMIN_ROLE()
    await contracts.aggregator.grantRole(adminRoleId, users.admin.address)

    return { contracts, users }

    async function grantUserRole(address, roleName) {
        const roleId = await contracts.oracleV1[roleName]()
        await contracts.oracleV1.grantRole(roleId, address)
    }
}

describe('Aggregator', () => {
    describe('addSource(address)', () => {
        it('rejects non-admin calls', async () => {
            const { contracts, users } = await bootSystem()
            await expect(contracts.aggregator.connect(users.anon).addSource(contracts.oracleV1.address)).rejects.toThrow()
        })

        it('adds a new feed source', async () => {
            const { contracts, users } = await bootSystem()

            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            const result = await contracts.aggregator.isSource(contracts.oracleV1.address)

            await expect(result).toEqual(true)
        })

        it('supports multiple new new feed sources', async () => {
            const { contracts, users } = await bootSystem()

            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            expect(await contracts.aggregator.isSource(contracts.oracleV1.address)).toEqual(true)

            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV2.address)
            expect(await contracts.aggregator.isSource(contracts.oracleV2.address)).toEqual(true)
        })
    })

    describe('removeSource(address)', () => {
        it('rejects non-admin calls', async () => {
            const { contracts, users } = await bootSystem()
            await expect(contracts.aggregator.connect(users.anon).removeSource(contracts.oracleV1.address)).rejects.toThrow()
        })

        it('removes a feed source', async () => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()

            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            await contracts.aggregator.connect(users.admin).removeSource(contracts.oracleV1.address)
            const result = await contracts.aggregator.isSource(contracts.oracleV1.address)

            await expect(result).toEqual(false)
        })

    })

    describe('isSource(address)', () => {
        it('returns false by default', async () => {
            const { contracts } = await bootSystem()
            expect(await contracts.aggregator.isSource(contracts.oracleV1.address)).toEqual(false)
        })

        it('returns true for added sources', async () => {
            const { contracts, users } = await bootSystem()
            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            expect(await contracts.aggregator.isSource(contracts.oracleV1.address)).toEqual(true)
        })

        it('returns false for removed sources', async () => {
            const { contracts, users } = await bootSystem()
            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            await contracts.aggregator.connect(users.admin).removeSource(contracts.oracleV1.address)
            expect(await contracts.aggregator.isSource(contracts.oracleV1.address)).toEqual(false)
        })
    })

    describe('sources()', () => {
        it('returns the list of sources', async () => {
            const { contracts, users } = await bootSystem()
            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV1.address)
            await contracts.aggregator.connect(users.admin).addSource(contracts.oracleV2.address)

            expect(await contracts.aggregator.sources()).toEqual([contracts.oracleV1.address, contracts.oracleV2.address])
        })
    })

    describe('getLatestValue(id)', () => {
        it('returns (value, updatedAt)', async () => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()

            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData)
            await contracts.aggregator.addSource(contracts.oracleV1.address)
            const result = await contracts.aggregator.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })

        it('returns the average for even list of multiple sources', async () => {
            const id = ethers.utils.formatBytes32String("test")
            const tokenData1 = [id, BigInt(2), BigInt(3)]
            const tokenData2 = [id, BigInt(4), BigInt(3)]

            const { contracts, users } = await bootSystem()

            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData1)
            await contracts.aggregator.addSource(contracts.oracleV1.address)

            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData2)
            await contracts.aggregator.addSource(contracts.oracleV2.address)

            const result = await contracts.aggregator.getLatestValue(id)
            await expect(Number(result[0])).toEqual(Number(tokenData1[1] + tokenData2[1]) / 2)
        })

        it('returns newest timestamp for even list of multiple sources', async () => {
            const id = ethers.utils.formatBytes32String("test")
            const tokenData1 = [id, BigInt(2), BigInt(4)]
            const tokenData2 = [id, BigInt(4), BigInt(3)]

            const { contracts, users } = await bootSystem()

            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData1)
            await contracts.aggregator.addSource(contracts.oracleV1.address)

            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData2)
            await contracts.aggregator.addSource(contracts.oracleV2.address)

            const result = await contracts.aggregator.getLatestValue(id)
            await expect(Number(result[1])).toEqual(Number(tokenData1[2]))
        })

        it('returns the median for odd list of multiple sources', async () => {
            const id = ethers.utils.formatBytes32String("test")
            const tokenData1 = [id, BigInt(2), BigInt(3)]
            const tokenData2 = [id, BigInt(4), BigInt(3)]
            const tokenData3 = [id, BigInt(6), BigInt(3)]

            const { contracts, users } = await bootSystem()

            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData1)
            await contracts.aggregator.addSource(contracts.oracleV1.address)

            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData2)
            await contracts.aggregator.addSource(contracts.oracleV2.address)

            const Oracle3 = await ethers.getContractFactory("OracleGasOptimized")
            const oracle3 = await Oracle3.deploy()
            await oracle3.updateReporter(users.reporter.address)
            await oracle3.connect(users.reporter).updateValue(...tokenData3)
            await contracts.aggregator.addSource(oracle3.address)

            const result = await contracts.aggregator.getLatestValue(id)
            await expect(Number(result[0])).toEqual(Number(tokenData2[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData2[2]))
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

