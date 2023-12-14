const { ethers } = require('hardhat')

async function bootSystem() {
    const [owner, anon, reporter] = await ethers.getSigners()
    const users = { owner, anon, reporter }

    const Contract = await ethers.getContractFactory("OracleGasOptimized")
    const contracts = {
        oracleV2: await Contract.deploy()
    }

    await contracts.oracleV2.updateReporter(reporter.address)
    return { contracts, users }

}

describe('OracleV2', () => {
    describe('updateReporter(address)', () => {
        it('rejects non-reporter calls', async() => {
            const { contracts, users } = await bootSystem()
            await expect(contracts.oracleV2.connect(users.anon).updateReporter(users.anon.address)).rejects.toThrow()
        })

        it('gives access to the new reporter address', async() => {
            const { contracts, users } = await bootSystem()
            await contracts.oracleV2.connect(users.reporter).updateReporter(users.anon.address)

            const tokenData = [ethers.utils.formatBytes32String("vet-usd"), BigInt(999999999), BigInt(666666)]
            await expect(contracts.oracleV2.connect(users.anon).updateValue(...tokenData)).resolves.not.toThrow()
        })

        it('removes access for previous reporter', async() => {
            const { contracts, users } = await bootSystem()
            contracts.oracleV2.connect(users.reporter).updateReporter(users.anon.address)
            await expect(contracts.oracleV2.connect(users.reporter).updateReporter(users.anon.address)).rejects.toThrow()
        })
    })
})