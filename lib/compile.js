const childProcess = require('child_process');
const fs = require('fs');

const { spawn } = childProcess;

/**
 * Compiles code found at `codePath` and outputs at the output path.
 *
 * @example
 * // Will compile contents, generating ./ft-mint.code` and ./ft-mint as outputs
 * compile('./code/ft-mint/ft-mint.code', './', 'ft-mint');
 *
 * @param {String} codePath - Path of code file to compile
 * @param {String} [outputPath=./] - Directory to output, defaults to current directory
 * @param {String} [outputName=out] - name of `.code` and `out` files. Defaults to out.
 */
async function compile(codePath, outputPath = './', outputName = 'out', options = {}) {
  const { maxReturn = 10000000, verbose = false } = options;
  if (!fs.existsSync(codePath)) {
    throw new Error('Compile input file(s) not found');
  }

  // Trims .code from the end of outputName
  const parsedOutputName = outputName.endsWith('.code') ? outputName.slice(0, -5) : outputName;
  // TODO: Check if outputPath is directory, otherwise throw.
  const parsedOutputPath = outputPath.endsWith('/') ? outputPath : `${outputPath}/`;

  return new Promise((resolve, reject) => {
    const zokrates = spawn(
      '/app/zokrates',
      ['compile', '-i', codePath, '-o', `${parsedOutputPath}${parsedOutputName}`],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ZOKRATES_HOME: '/app/stdlib',
        },
      },
    );

    let output = '';

    zokrates.stdout.on('data', data => {
      if (verbose) {
        output += data.toString('utf8');
        // If the entire output gets too large, just send ...[truncated].
        if (output.length > maxReturn) output = '...[truncated]';
      }
    });

    zokrates.stderr.on('data', err => {
      reject(new Error(`Compile failed: ${err}`));
    });

    zokrates.on('close', () => {
      // ZoKrates sometimes outputs error through stdout instead of stderr,
      // so we need to catch those errors manually.
      if (output.includes('panicked')) {
        reject(new Error(output.slice(output.indexOf('panicked'))));
      }
      if (verbose) resolve(output);
      else resolve();
    });
  });
}

module.exports = compile;
