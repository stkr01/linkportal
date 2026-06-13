#!/usr/bin/env node
// Packs the LinkPortal browser extension into a signed CRX3 for self-hosting on
// skzdev02, and emits the matching update manifest + ready-to-use enterprise
// policy .reg files for Chrome and Edge.
//
//   cd deploy/skzdev02/ext-packager
//   npm install
//   npm run build
//   # or override the public host:
//   EXT_BASE_URL=https://skzdev02.tail898daf.ts.net npm run build
//
// Outputs (in ./build/):
//   linkportal.crx     signed extension (host this at /ext/linkportal.crx)
//   linkportal.zip     unsigned zip (handy for "Load unpacked" / Web Store later)
//   updates.xml        update manifest (host this at /ext/updates.xml)
//   policy-chrome.reg  HKLM ExtensionInstallForcelist for Google Chrome
//   policy-edge.reg    HKLM ExtensionInstallForcelist for Microsoft Edge
//
// The signing key (extension-key.pem) is generated on first run and then reused so
// the extension ID stays stable. KEEP AND BACK IT UP — losing it changes the ID and
// breaks auto-updates for already-installed clients. It is git-ignored.

import crx3 from 'crx3';
import { existsSync } from 'node:fs';
import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_SRC = path.resolve(here, '../../../extension'); // vanilla extension source
const BUILD = path.join(here, 'build');
const STAGING = path.join(BUILD, 'staging');
const KEY = path.join(here, 'extension-key.pem'); // persisted, git-ignored

const BASE_URL = (process.env.EXT_BASE_URL || 'https://skzdev02.tail898daf.ts.net').replace(/\/+$/, '');
const CRX_URL = `${BASE_URL}/ext/linkportal.crx`;
const XML_URL = `${BASE_URL}/ext/updates.xml`;

// Only these files/dirs ship in the package. Helpers like make-icons.js stay out.
const INCLUDE = [
  'manifest.json',
  'api.js',
  'background.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'options.html',
  'options.js',
  'icons',
];

async function stageExtension() {
  await rm(BUILD, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  for (const name of INCLUDE) {
    const from = path.join(EXT_SRC, name);
    if (!existsSync(from)) throw new Error(`Missing extension file: ${from}`);
    await cp(from, path.join(STAGING, name), { recursive: true });
  }
}

// Inject production values into the STAGED copies; the source stays dev-friendly.
async function injectProd() {
  // 1) api.js default baseUrl -> production host.
  const apiPath = path.join(STAGING, 'api.js');
  let api = await readFile(apiPath, 'utf8');
  if (!/baseUrl:\s*'http:\/\/localhost:4000'/.test(api)) {
    throw new Error('Could not find the default baseUrl in api.js to rewrite for production.');
  }
  api = api.replace(/baseUrl:\s*'http:\/\/localhost:4000'/, `baseUrl: '${BASE_URL}'`);
  await writeFile(apiPath, api);

  // 2) manifest: production host_permissions + self-hosted update_url.
  const manifestPath = path.join(STAGING, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.host_permissions = [`${BASE_URL}/*`];
  manifest.update_url = XML_URL;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest.version;
}

function extIdFromXml(xml) {
  const m = xml.match(/appid=['"]([a-p]{32})['"]/);
  return m ? m[1] : null;
}

function regFile(browserKey, extId) {
  // HKLM policy applies on standalone Win11 too (Chrome/Edge read HKLM Policies).
  return [
    'Windows Registry Editor Version 5.00',
    '',
    `[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\${browserKey}\\ExtensionInstallForcelist]`,
    `"1"="${extId};${XML_URL}"`,
    '',
  ].join('\r\n');
}

async function main() {
  await stageExtension();
  const version = await injectProd();

  await crx3([path.join(STAGING, 'manifest.json')], {
    keyPath: KEY,
    crxPath: path.join(BUILD, 'linkportal.crx'),
    zipPath: path.join(BUILD, 'linkportal.zip'),
    xmlPath: path.join(BUILD, 'updates.xml'),
    crxURL: CRX_URL,
  });

  const xml = await readFile(path.join(BUILD, 'updates.xml'), 'utf8');
  const extId = extIdFromXml(xml);
  if (!extId) throw new Error('Could not determine the extension ID from updates.xml.');

  await writeFile(path.join(BUILD, 'policy-chrome.reg'), regFile('Google\\Chrome', extId));
  await writeFile(path.join(BUILD, 'policy-edge.reg'), regFile('Microsoft\\Edge', extId));

  const rel = (p) => path.relative(process.cwd(), p);
  console.log('\n  LinkPortal extension packaged');
  console.log('  -----------------------------');
  console.log(`  Version      : ${version}`);
  console.log(`  Extension ID : ${extId}`);
  console.log(`  CRX URL      : ${CRX_URL}`);
  console.log(`  Update XML   : ${XML_URL}`);
  console.log(`  Output       : ${rel(BUILD)}/`);
  console.log('\n  Publish to the directory nginx serves on /ext/:');
  console.log('    sudo mkdir -p /opt/linkportal/extension-dist');
  console.log(`    sudo cp ${rel(path.join(BUILD, 'linkportal.crx'))} ${rel(path.join(BUILD, 'updates.xml'))} /opt/linkportal/extension-dist/`);
  console.log('    sudo chmod 755 /opt/linkportal/extension-dist && sudo chmod 644 /opt/linkportal/extension-dist/*');
  console.log('\n  Force-install policy string (Chrome & Edge):');
  console.log(`    ${extId};${XML_URL}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
