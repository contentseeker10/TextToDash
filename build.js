const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watchMode = process.argv.includes('--watch');

function copyUiHtml() {
  const srcPath = path.join(__dirname, 'src', 'ui.html');
  const destPath = path.join(__dirname, 'dist', 'ui.html');
  
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'));
  }
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log('Copied ui.html to dist/');
  } else {
    // Write a dummy ui.html if it doesn't exist yet
    fs.writeFileSync(destPath, '<!-- UI placeholder -->');
  }
}

async function run() {
  const ctx = await esbuild.context({
    entryPoints: ['src/code.ts'],
    bundle: true,
    platform: 'browser',
    outfile: 'dist/code.js',
    minify: !watchMode,
    sourcemap: watchMode,
  });

  copyUiHtml();

  if (watchMode) {
    console.log('Watching for changes...');
    await ctx.watch();
    
    // Watch ui.html changes manually since esbuild doesn't watch static files
    fs.watch(path.join(__dirname, 'src'), (eventType, filename) => {
      if (filename === 'ui.html') {
        try {
          copyUiHtml();
        } catch (err) {
          console.error('Error copying ui.html:', err);
        }
      }
    });
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build completed successfully.');
  }
}

run().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
