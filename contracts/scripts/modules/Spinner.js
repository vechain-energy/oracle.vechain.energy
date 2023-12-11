const ora = require('ora')
const chalk = require('chalk')
const { CI } = process.env

module.exports = function (options) {
  const spinner = ora(options)

  spinner._infoWithStop = spinner.info
  spinner._warnWithStop = spinner.warn

  const restartIfNotCi = () => {
    if (!CI) {
      spinner.start()
    }
  }

  spinner.info = (options) => {
    spinner._infoWithStop(typeof (options) === 'string' ? chalk.grey(options) : options)
    restartIfNotCi()
  }

  spinner.warn = (options) => {
    spinner._warnWithStop(options)
    restartIfNotCi()
  }

  spinner.start()
  return spinner
}
