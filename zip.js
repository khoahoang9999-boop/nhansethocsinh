import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import esbuild from 'esbuild';

const rootDir = process.cwd();
const extBuildDir = path.join(rootDir, 'extension-build');
if (!fs.existsSync(extBuildDir)) {
  fs.mkdirSync(extBuildDir, { recursive: true });
}

const extensionFiles = [
  'manifest.json',
  'content.js',
  'background.js',
  'auth-ui.html',
  'auth-ui.js',
  'options.html',
  'options.js',
  'popup.html',
  'popup.js',
  'style.css',
  'shared.js',
  'inject.js',
  'icon16.png',
  'icon48.png',
  'icon128.png',
  'icon_v2_16.png',
  'icon_v2_48.png',
  'icon_v2_128.png',
  'icon_v3_16.png',
  'icon_v3_48.png',
  'icon_v3_128.png'
];

for (const file of extensionFiles) {
  let src = path.join(rootDir, file);
  if (!fs.existsSync(src)) {
    src = path.join(rootDir, 'public', file);
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(extBuildDir, file));
  }
}

try {
  esbuild.buildSync({
    entryPoints: [path.join(rootDir, 'auth-ui.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(extBuildDir, 'auth-ui.js')
  });
  esbuild.buildSync({
    entryPoints: [path.join(rootDir, 'options.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(extBuildDir, 'options.js')
  });
  esbuild.buildSync({
    entryPoints: [path.join(rootDir, 'popup.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(extBuildDir, 'popup.js')
  });
  esbuild.buildSync({
    entryPoints: [path.join(rootDir, 'public', 'background.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(extBuildDir, 'background.js')
  });
} catch (e) {
  console.error("Bundle error in zip.js:", e);
}

const tempZip = path.resolve('temp-extension.zip');
if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);

const output = fs.createWriteStream(tempZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  const bytes = archive.pointer();
  console.log(bytes + ' total bytes zip created.');

  if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
  if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });

  fs.copyFileSync(tempZip, 'public/nhan-xet-diem-v3.zip');
  fs.copyFileSync(tempZip, 'dist/nhan-xet-diem-v3.zip');
  fs.copyFileSync(tempZip, 'public/nhan-xet-diem-v28.09.2026.zip');
  fs.copyFileSync(tempZip, 'dist/nhan-xet-diem-v28.09.2026.zip');
  try { fs.unlinkSync(tempZip); } catch (e) {}

  console.log('Successfully written to public/nhan-xet-diem-v28.09.2026.zip and public/nhan-xet-diem-v3.zip');
  process.exit(0);
});

archive.on('error', function(err) {
  console.error('Archiving error:', err);
  process.exit(1);
});

archive.pipe(output);
// Only pack into a single clean folder: Nhan-xet-diem-v28.09.2026
archive.directory(extBuildDir, 'Nhan-xet-diem-v28.09.2026');
archive.finalize();
