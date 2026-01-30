const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const sourceDirs = [
    path.join(projectRoot, 'js'),
    path.join(projectRoot, 'css'),
    projectRoot // for index.html
];

// Extensions to look for code in
const codeExtensions = ['.js', '.html', '.css', '.json', '.md'];

// Function to recursively get files
function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.vscode' && file !== 'brain') {
                results = results.concat(getFiles(filePath));
            }
        } else {
            results.push(filePath);
        }
    });
    return results;
}

// 1. Get all asset files
console.log('Scanning assets...');
const allAssets = getFiles(assetsDir);
const assetRelativePaths = allAssets.map(p => path.relative(projectRoot, p).replace(/\\/g, '/'));
console.log(`Found ${assetRelativePaths.length} assets.`);

// 2. Get all code content
console.log('Scanning code...');
let codeContent = '';
const codeFiles = getFiles(projectRoot).filter(f => {
    // Exclude assets dir itself from code scan to avoid self-reference (though finding the file itself is fine)
    if (f.includes(path.join(projectRoot, 'assets'))) return false;
    // Exclude .git, etc
    if (f.includes('.git')) return false;

    return codeExtensions.includes(path.extname(f));
});

codeFiles.forEach(f => {
    try {
        codeContent += fs.readFileSync(f, 'utf8');
    } catch (e) {
        console.error(`Error reading ${f}:`, e);
    }
});

// 3. Check usage
const unusedAssets = [];
const usedAssets = [];

assetRelativePaths.forEach(assetPath => {
    // Check for "assets/filename.png" or just "filename.png"
    // We strictly check for the filename to be safe, but ideally the full path.
    // However, some code might do "assets/" + "filename.png"
    const filename = path.basename(assetPath);
    // const relativePathStr = assetPath; // like "assets/images/foo.png"

    // Simple check: does the filename appear in the code?
    // This is conservative. If "icon.png" is in code, we assume it's used.
    if (codeContent.includes(filename)) {
        usedAssets.push(assetPath);
    } else {
        unusedAssets.push(assetPath);
    }
});

console.log('---------------------------------------------------');
console.log('UNUSED ASSETS CANDIDATES:');
console.log(JSON.stringify(unusedAssets, null, 2));
console.log('---------------------------------------------------');
console.log(`Total Unused: ${unusedAssets.length}`);
