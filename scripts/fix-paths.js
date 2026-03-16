const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "../dist");

// Regex replacement for gh-pages
function fixPathsInContent(content) {
  let fixed = content;

  fixed = fixed.replace(/\.\.\/_expo\//g, "./_expo/");

  fixed = fixed.replace(/\/_expo\//g, "./_expo/");

  fixed = fixed.replace(/\/assets\//g, "./assets/");

  fixed = fixed.replace(/\/favicon/g, "./favicon");

  fixed = fixed.replace(/src="\.\.\/\//g, 'src="./');
  fixed = fixed.replace(/href="\.\.\/\//g, 'href="./');

  return fixed;
}

// fix index.html specifically for visibility
const indexPath = path.join(distPath, "index.html");
try {
  const originalHtml = fs.readFileSync(indexPath, "utf-8");
  const fixedHtml = fixPathsInContent(originalHtml);

  if (fixedHtml !== originalHtml) {
    fs.writeFileSync(indexPath, fixedHtml, "utf-8");
    console.log("✓ Fixed paths in index.html");
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
