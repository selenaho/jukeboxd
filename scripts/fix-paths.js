const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "../dist");

// Regex replacement for gh-pages
function fixPathsInContent(content) {
  let fixed = content;

  // Replace ../_expo/ with ./_expo/ (relative paths to parent)
  fixed = fixed.replace(/\.\.\/_expo\//g, "./_expo/");

  // Replace "/assets/ with "./assets/ (in string literals with double quotes)
  fixed = fixed.replace(/\"\/assets\//g, '"./assets/');

  // Replace '/assets/ with './assets/ (in string literals with single quotes)
  fixed = fixed.replace(/\'\/assets\//g, "'./assets/");

  // Replace src="/..." with src="./..." (but not src="//...")
  fixed = fixed.replace(/src="\/([^/])/g, 'src="./$1');

  // Replace href="/..." with href="./..." (but not href="//...")
  fixed = fixed.replace(/href="\/([^/])/g, 'href="./$1');

  return fixed;
}

// fix index.html specifically for visibility
const indexPath = path.join(distPath, "index.html");
try {
  let originalHtml = fs.readFileSync(indexPath, "utf-8");
  let fixedHtml = fixPathsInContent(originalHtml);

  // Inject <base> tag for Expo Router to work correctly with GitHub Pages subdirectory
  // This tells the browser to treat /jukeboxd/ as the base URL for relative paths
  const baseTag = '<base href="/jukeboxd/" />';
  if (!fixedHtml.includes("<base href=")) {
    // Insert base tag right after <head> opening tag
    fixedHtml = fixedHtml.replace(/<head[^>]*>/, `$&\n    ${baseTag}`);
    console.log("✓ Injected <base> tag for GitHub Pages subdirectory routing");
  }

  // Add a noscript redirect fallback and script for better deep linking support
  const head = fixedHtml.match(/<head[^>]*>/);
  if (head && !fixedHtml.includes('id="expo-spa-root"')) {
    // Add div with proper ID for Expo Router
    const rootScriptTag = `<div id="expo-spa-root"></div>`;
    if (!fixedHtml.includes('id="expo-spa-root"')) {
      fixedHtml = fixedHtml.replace(/<head[^>]*>[\s\S]*?<body[^>]*>/, 
        match => match.replace(/<body[^>]*>/, `$&\n    ${rootScriptTag}`));
    }
  }

  if (fixedHtml !== originalHtml) {
    fs.writeFileSync(indexPath, fixedHtml, "utf-8");
    if (!originalHtml.includes("<base href=")) {
      console.log("✓ Fixed paths in index.html and added base tag");
    } else {
      console.log("✓ Fixed paths in index.html");
    }
  } else {
    console.log("ℹ No path changes needed in index.html");
  }
} catch (err) {
  console.error("✗ Error processing index.html:", err.message);
}

// Recursively walk dist and fix all JS/HTML files
function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith(".js") || file.endsWith(".html")) {
        // Skip index.html as it's already processed
        if (file === "index.html" && dir === distPath) {
          return;
        }

        try {
          const original = fs.readFileSync(fullPath, "utf-8");
          const fixed = fixPathsInContent(original);

          if (fixed !== original) {
            fs.writeFileSync(fullPath, fixed, "utf-8");
            console.log(
              `✓ Fixed paths in ${path.relative(distPath, fullPath)}`,
            );
          }
        } catch (err) {
          console.error(
            `✗ Error processing ${path.relative(distPath, fullPath)}: ${err.message}`,
          );
        }
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
}

console.log("Fixing all asset paths in dist folder...");
walkDir(distPath);
console.log("✓ All done!");
