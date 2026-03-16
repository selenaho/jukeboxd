const fs = require("fs");
const path = require("path");

// Fix paths in index.html for GitHub Pages subdirectory deployment
const indexPath = path.join(__dirname, "../dist/index.html");

let html = fs.readFileSync(indexPath, "utf-8");

// Replace absolute paths with relative paths
html = html.replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');

fs.writeFileSync(indexPath, html, "utf-8");

console.log("Fixed asset paths in dist/index.html");
