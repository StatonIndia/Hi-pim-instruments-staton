const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

// Replace the entire if (mob) block inside the else of includeTool
let pattern = /if\s*\(mob\)\s*\{\s*\/\/\s*Mobile scroll-up[\s\S]*?else\s*\{\s*\/\/\s*Desktop: tool transitions back via scrub reverse[^\n]*\n([^\n]+)\n([^\n]+)\n\s*\}\s*\}/;

content = content.replace(pattern, (match, p1, p2) => {
    return `// Both Desktop and Mobile: tool transitions back via scrub reverse - just restore visibility\n${p1}\n${p2}`;
});

// Replace onEnterBack to always pass false for includeTool on mobile
content = content.replace(/onEnterBack:\s*\(\)\s*=>\s*playWhyTimeline\(true,\s*isMobile\(\)\s*\?\s*true\s*:\s*false\)/, "onEnterBack: () => playWhyTimeline(true, false)");

fs.writeFileSync('script.js', content);
