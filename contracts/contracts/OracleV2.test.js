const { ethers } = require('hardhat')

async function bootSystem() {
    const [owner, anon, reporter] = await ethers.getSigners()
    const users = { owner, anon, reporter }

    const Contract = await ethers.getContractFactory("OracleV2")
    const contracts = {
        oracleV2: await Contract.deploy()
    }

    await contracts.oracleV2.updateOracleUpdaterAddress(reporter.address)
    return { contracts, users }

}

describe('OracleV2', () => {
    describe('getLatestValue(id)', () => {
        it('returns (value, updatedAt)', async() => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData)
            const result = await contracts.oracleV2.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })
    })

    describe('updateValue(id, newValue, newTimestamp)', () => {
        it('rejects non-reporter calls', async() => {
            const { contracts, users } = await bootSystem()
            await expect(contracts.oracleV2.connect(users.anon).updateValue(ethers.utils.formatBytes32String(""), 0, 0)).rejects.toThrow()
        })

        it('stores input correctly', async() => {
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const { contracts, users } = await bootSystem()
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData)
            const result = await contracts.oracleV2.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })

        it('accepts multiple ids', async() => {
            const tokenData1 = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]
            const tokenData2 = [ethers.utils.formatBytes32String("test2"), BigInt(4), BigInt(5)]

            const { contracts, users } = await bootSystem()
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData1)
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData2)

            const result1 = await contracts.oracleV2.getLatestValue(tokenData1[0])
            await expect(Number(result1[0])).toEqual(Number(tokenData1[1]))
            await expect(Number(result1[1])).toEqual(Number(tokenData1[2]))

            const result2 = await contracts.oracleV2.getLatestValue(tokenData2[0])
            await expect(Number(result2[0])).toEqual(Number(tokenData2[1]))
            await expect(Number(result2[1])).toEqual(Number(tokenData2[2]))
        })

        it('updates values correctly', async() => {
            const tokenDataBefore = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(2)]
            const tokenDataAfter = [ethers.utils.formatBytes32String("test"), BigInt(10), BigInt(20)]

            const { contracts, users } = await bootSystem()
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenDataBefore)
            await contracts.oracleV2.connect(users.reporter).updateValue(...tokenDataAfter)
            const result = await contracts.oracleV2.getLatestValue(tokenDataBefore[0])

            await expect(Number(result[0])).toEqual(Number(tokenDataAfter[1]))
            await expect(Number(result[1])).toEqual(Number(tokenDataAfter[2]))
        })

        it('emits ValueUpdate(bytes32 id, uint256 value, uint64 updatedAt)', async() => {
            const tokenData = [ethers.utils.formatBytes32String("vet-usd"), BigInt(999999999), BigInt(666666)]

            const { contracts, users } = await bootSystem()

            const tx = await (await contracts.oracleV2.connect(users.reporter).updateValue(...tokenData)).wait()
            const event = tx.events.find(({ event }) => event === 'ValueUpdate')

            await expect(event.args.id).toEqual(tokenData[0])
            await expect(Number(event.args.value)).toEqual(Number(tokenData[1]))
            await expect(Number(event.args.updatedAt)).toEqual(Number(tokenData[2]))
        })
    })

    describe('updateValuePublic(message, feedId)', () => {
        it('stores input correctly', async() => {
            const { contracts, users } = await bootSystem()
            const tokenData = [ethers.utils.formatBytes32String("test"), BigInt(1), BigInt(3)]

            const data = signCcipRequestWith({
                sender: '0x09425C56F3c24E72dFa3E15f007435eb048b6c61',
                validUntil: Math.ceil(Date.now() / 1000) + 60,
                callData: tokenData[0],
                extraData: tokenData[0],
                value: tokenData[1],
                updatedAt: tokenData[2]
            }, '0x4c764fa090cf8cc7a90b62881202f94aaaca380bb17d13925d1e84ae0f1d99af')

            await contracts.oracleV2.connect(users.reporter).updateOracleUpdaterAddress('0x09425C56F3c24E72dFa3E15f007435eb048b6c61')
            await contracts.oracleV2.connect(users.anon).updateValuePublic(data, tokenData[0])

            const result = await contracts.oracleV2.getLatestValue(tokenData[0])

            await expect(Number(result[0])).toEqual(Number(tokenData[1]))
            await expect(Number(result[1])).toEqual(Number(tokenData[2]))
        })
    })
})



function signCcipRequestWith(message, privateKey) {
    const encodedResponse = ethers.utils.defaultAbiCoder.encode(['uint128', 'uint128'], [message.value, message.updatedAt])
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