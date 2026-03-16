const fs = require("fs");
const path = require("path");

// Fix paths in index.html and JS bundles for GitHub Pages subdirectory deployment
const distPath = path.join(__dirname, "../dist");
const indexPath = path.join(distPath, "index.html");

// Fix index.html
let html = fs.readFileSync(indexPath, "utf-8");
html = html.replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');
fs.writeFileSync(indexPath, html, "utf-8");

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
        let content = fs.readFileSync(fullPath, "utf-8");
        const original = content;

        // Replace all absolute paths with relative ones
        content = content.replace(/"\/_expo\//g, '"\./_expo/');
        content = content.replace(/'\/_expo\//g, "'\./_expo/");
        content = content.replace(/\/_expo\//g, "./_expo/");
        content = content.replace(/\/assets\//g, "./assets/");
        content = content.replace(/\/favicon\.ico/g, "./favicon.ico");

        if (content !== original) {
          fs.writeFileSync(fullPath, content, "utf-8");
          console.log(`✓ Fixed paths in ${path.relative(distPath, fullPath)}`);
        }
      }
    });
  } catch (err) {
    console.error(`Error in directory ${dir}:`, err.message);
  }
}

console.log("Fixing all asset paths in dist folder...");
walkDir(distPath);
console.log("✓ Done!");
