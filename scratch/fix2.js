const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Find the line that needs the closing brace and inject it
code = code.replace(
    /(\s*if \(whyToolImg\) whyToolImg\.classList\.remove\('pause-float'\);\s*)(\} else \{\s*\/\/ - SLOW: scrolling DOWN)/,
    '$1}\n      $2'
);

fs.writeFileSync('script.js', code);
