const hre = require('hardhat')
const Spinner = require('./modules/Spinner')
const getNetworkName = require('./modules/getNetworkName')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const UUPSUpgradeable = require('@openzeppelin/contracts/build/contracts/UUPSUpgradeable.json')
const { ARTIFACTS_DIR } = require('./modules/constants')

async function main () {
  // get contract names to deploy
  const contractNames = process.argv.slice(2)

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

  for (const contractName of contractNames) {
    const statusArtifact = JSON.parse(readFileSync(`${networkArtifactsDir}/${contractName}.json`))
    const deploying = Spinner(`[${contractName}] Deploying Contract `)

    // get contract to deploy
    const Contract = await hre.thor.getContractFactory(contractName)
    const { abi } = await hre.artifacts.readArtifact(contractName)

    // deploy and wait for result
    const deployedContract = await Contract.deploy()
    await deployedContract.deployed()

    deploying.info(`[${contractName}] Transaction Id: ${deployedContract.deployTransaction.hash}`)
    deploying.info(`[${contractName}] Contract is now available at ${deployedContract.address}`)

    const proxyAddress = statusArtifact.address
    deploying.text = `[${contractName}] Upgrading proxy at ${proxyAddress}`
    const proxy = await hre.thor.getContractAt(UUPSUpgradeable.abi, proxyAddress)
    await proxy.upgradeTo(deployedContract.address)

    // archive contract interface and address
    writeFileSync(`${networkArtifactsDir}/${contractName}.json`, JSON.stringify({ ...statusArtifact, address: proxy.address, implementationAddress: deployedContract.address, abi }, '', 2))
    deploying.info(`[${contractName}] Artifact updated at ${networkArtifactsDir}/${contractName}.json`)

    // deploy proxy
    deploying.succeed(`[${contractName}] Upgraded Contract available at Proxy ${proxyAddress}\n`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
