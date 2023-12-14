const { ethers } = require('hardhat')
const Web3EthAbi = require('web3-eth-abi')
const ERC1967Proxy = require('@openzeppelin/contracts/build/contracts/ERC1967Proxy.json')

async function bootSystem() {
    const [owner, upgrader, anon, reporter, user1, user2, user3] = await ethers.getSigners()
    const users = { owner, upgrader, anon, reporter, user1, user2, user3 }

    const contracts = {
        oracleV1: await getContractWithProxy('OracleUpgradeable')
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