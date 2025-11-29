#!/usr/bin/env node
/**
 * Downloads the Syncthing binary for the current platform
 * and places it in the src-tauri/binaries folder with the correct target triple name.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYNCTHING_VERSION = 'v1.27.12';

// Map of Rust target triples to Syncthing release names
const PLATFORM_MAP = {
  'x86_64-unknown-linux-gnu': { os: 'linux', arch: 'amd64' },
  'aarch64-unknown-linux-gnu': { os: 'linux', arch: 'arm64' },
  'x86_64-apple-darwin': { os: 'macos', arch: 'amd64' },
  'aarch64-apple-darwin': { os: 'macos', arch: 'arm64' },
  'x86_64-pc-windows-msvc': { os: 'windows', arch: 'amd64' },
};

async function getTargetTriple() {
  const rustInfo = execSync('rustc -vV').toString();
  const match = /host: (\S+)/.exec(rustInfo);
  if (!match) {
    throw new Error('Failed to determine platform target triple');
  }
  return match[1];
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          https
            .get(response.headers.location, (redirectResponse) => {
              redirectResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve();
              });
            })
            .on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      })
      .on('error', reject);
  });
}

async function extractTarGz(tarGzPath, destDir) {
  execSync(`tar -xzf "${tarGzPath}" -C "${destDir}"`);
}

async function extractZip(zipPath, destDir) {
  execSync(`unzip -o "${zipPath}" -d "${destDir}"`);
}

async function main() {
  try {
    const targetTriple = await getTargetTriple();
    console.log(`Target triple: ${targetTriple}`);

    const platformInfo = PLATFORM_MAP[targetTriple];
    if (!platformInfo) {
      throw new Error(`Unsupported platform: ${targetTriple}`);
    }

    const binariesDir = path.join(__dirname, '..', 'src-tauri', 'binaries');
    const tempDir = path.join(__dirname, '..', 'temp');

    // Create directories
    fs.mkdirSync(binariesDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });

    const extension = platformInfo.os === 'windows' ? '.exe' : '';
    const archiveExt = platformInfo.os === 'windows' ? 'zip' : 'tar.gz';
    const archiveName = `syncthing-${platformInfo.os}-${platformInfo.arch}-${SYNCTHING_VERSION}`;
    const downloadUrl = `https://github.com/syncthing/syncthing/releases/download/${SYNCTHING_VERSION}/${archiveName}.${archiveExt}`;

    console.log(
      `Downloading Syncthing ${SYNCTHING_VERSION} for ${platformInfo.os}-${platformInfo.arch}...`
    );
    console.log(`URL: ${downloadUrl}`);

    const archivePath = path.join(tempDir, `${archiveName}.${archiveExt}`);

    // Download the archive
    await downloadFile(downloadUrl, archivePath);
    console.log('Download complete.');

    // Extract
    console.log('Extracting...');
    if (platformInfo.os === 'windows') {
      await extractZip(archivePath, tempDir);
    } else {
      await extractTarGz(archivePath, tempDir);
    }

    // Move binary to binaries folder with correct name
    const sourceBinary = path.join(tempDir, archiveName, `syncthing${extension}`);
    const destBinary = path.join(binariesDir, `syncthing-${targetTriple}${extension}`);

    console.log(`Moving binary to ${destBinary}`);
    fs.copyFileSync(sourceBinary, destBinary);

    // Make executable on Unix
    if (platformInfo.os !== 'windows') {
      fs.chmodSync(destBinary, 0o755);
    }

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log('Syncthing binary installed successfully!');
    console.log(`Binary location: ${destBinary}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
