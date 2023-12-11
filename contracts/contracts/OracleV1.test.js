const { ethers } = require('hardhat')
const Web3EthAbi = require('web3-eth-abi')
const ERC1967Proxy = require('@openzeppelin/contracts/build/contracts/ERC1967Proxy.json')

async function bootSystem() {
    const [owner, upgrader, anon, reporter, user1, user2, user3] = await ethers.getSigners()
    const users = { owner, upgrader, anon, reporter, user1, user2, user3 }

    const contracts = {
        oracleV1: await getContractWithProxy('OracleV1')
    }

    await grantUserRole(users.upgrader.address, 'UPGRADER_ROLE')
    await grantUserRole(users.reporter.address, 'REPORTER_ROLE')

    return { contracts, users }

    async function grantUserRole(address, roleName) {
        const roleId = await contracts.oracleV1[roleName]()
        await contracts.oracleV1.grantRole(roleId, address)
    }
}

describe('OracleV1', () => {
    describe('getLatestValue(id)', () => {
        it('returns (value, updatedAt)', async() => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData)
            const result = await contracts.oracleV1.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })

        it('reverts for invalid ids', async() => {
            const { contracts } = await bootSystem()
            await expect(contracts.oracleV1.getLatestValue(ethers.utils.formatBytes32String('missing'))).rejects.toThrow('invalid id')
        })
    })

    describe('updateValue(id, newValue, newTimestamp)', () => {
        it('requires REPORTER_ROLE', async() => {
            const { contracts, users } = await bootSystem()
            const role = await contracts.oracleV1.REPORTER_ROLE()
            await expect(contracts.oracleV1.connect(users.anon).updateValue(ethers.utils.formatBytes32String(""), 0, 0)).rejects.toThrow(`is missing role ${role}`)
        })

        it('stores input correctly', async() => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData)
            const result = await contracts.oracleV1.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })

        it('accepts multiple ids', async() => {
            const tokenData1 = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const tokenData2 = [ethers.utils.formatBytes32String("test2"), BigInt(4), BigInt(5)]

            const { contracts, users } = await bootSystem()
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData1)
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData2)

            const result1 = await contracts.oracleV1.getLatestValue(tokenData1[0])
            await expect(Number(result1[0])).toEqual(Number(tokenData1[1]))
            await expect(Number(result1[1])).toEqual(Number(tokenData1[2]))

            const result2 = await contracts.oracleV1.getLatestValue(tokenData2[0])
            await expect(Number(result2[0])).toEqual(Number(tokenData2[1]))
            await expect(Number(result2[1])).toEqual(Number(tokenData2[2]))
        })

        it('updates values correctly', async() => {
            const tokenDataBefore = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(2)]
            const tokenDataAfter = [ethers.utils.formatBytes32String("test"), BigInt(10), BigInt(20)]

            const { contracts, users } = await bootSystem()
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenDataBefore)
            await contracts.oracleV1.connect(users.reporter).updateValue(...tokenDataAfter)
            const result = await contracts.oracleV1.getLatestValue(tokenDataBefore[0])

            await expect(Number(result[0])).toEqual(Number(tokenDataAfter[1]))
            await expect(Number(result[1])).toEqual(Number(tokenDataAfter[2]))
        })

        it('emits ValueUpdate(bytes32 id, uint256 value, uint64 updatedAt)', async() => {
            const tokenData = [ethers.utils.formatBytes32String("vet-usd"), BigInt(999999999), BigInt(666666)]

            const { contracts, users } = await bootSystem()

            const tx = await (await contracts.oracleV1.connect(users.reporter).updateValue(...tokenData)).wait()
            const event = tx.events.find(({ event }) => event === 'ValueUpdate')

            await expect(event.args.id).toEqual(tokenData[0])
            await expect(Number(event.args.value)).toEqual(Number(tokenData[1]))
            await expect(Number(event.args.updatedAt)).toEqual(Number(tokenData[2]))
        })
    })


    describe('Proxy', () => {
        it('upgrade requires UPGRADER_ROLE', async() => {
            const { contracts, users } = await bootSystem()
            const role = await contracts.oracleV1.UPGRADER_ROLE()
            await expect(contracts.oracleV1.connect(users.anon).upgradeTo(contracts.oracleV1.address)).rejects.toThrow(`is missing role ${role}`)
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