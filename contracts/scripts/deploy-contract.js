const hre = require('hardhat')
const Spinner = require('./modules/Spinner')
const getNetworkName = require('./modules/getNetworkName')
const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { ARTIFACTS_DIR } = require('./modules/constants')

async function main() {
    // get contract names to deploy
    const contractNames = process.argv.slice(2)
    const [owner] = await hre.thor.getSigners();

    if (!contractNames.length) {
        throw new Error('No contract names for deployment given')
    }

    const network = await getNetworkName(hre)
    console.log(`\nDeploying to **${String(network).toUpperCase()}** network\n`)

    // ensure artifact directory in web app exists
    const networkArtifactsDir = `${ARTIFACTS_DIR}/${network}`
    if (!existsSync(networkArtifactsDir)) {
        mkdirSync(networkArtifactsDir, { recursive: true })
    }

    for (const contractNameWithParams of contractNames) {
        const [contractName, ...args] = contractNameWithParams.split(':')
        const deploying = Spinner(`[${contractName}] Deploying Contract `)

        // get contract to deploy
        const Contract = await hre.thor.getContractFactory(contractName)
        const { abi } = await hre.artifacts.readArtifact(contractName)

        // deploy and wait for result
        const deployedContract = await Contract.connect(owner).deploy(...args)
        await deployedContract.deployed()

        // archive contract interface and address
        writeFileSync(`${networkArtifactsDir}/${contractName}.json`, JSON.stringify({ address: deployedContract.deployTransaction.creates, abi }, '', 2))
        deploying.info(`[${contractName}] Artifact written to ${networkArtifactsDir}/${contractName}.json`)
        deploying.info(`[${contractName}] Transaction Id: ${deployedContract.deployTransaction.hash}`)
        deploying.succeed(`[${contractName}] Contract is now available at ${deployedContract.deployTransaction.creates}\n`)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })