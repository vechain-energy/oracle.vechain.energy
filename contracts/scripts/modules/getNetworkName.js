module.exports = async function getNetworkName (hre) {
  const NETWORK_IDS = {
    74: 'main',
    39: 'test'
  }
  const provider = await hre.thor.getProvider()
  return NETWORK_IDS[provider.provider.chainTag] || 'local'
}
