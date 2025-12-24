const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/user/Downloads/TheBB_influencer';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    // 1. Remove redundant chatbot HTML
    const chatbotRegex = /<!-- Chatbot Button -->[\s\S]*?<\/form>\s*?<\/div>/g;
    content = content.replace(chatbotRegex, '');

    // 2. Ensure chatbot.js is linked before </body>
    if (!content.includes('assets/js/chatbot.js')) {
        content = content.replace('</body>', '    <script src="assets/js/chatbot.js"></script>\n</body>');
    }

    // 3. Fix navigation links (remove .html extension)
    content = content.replace(/href="index\.html"/g, 'href="/"');
    content = content.replace(/href="events\.html"/g, 'href="/events"');
    content = content.replace(/href="about\.html"/g, 'href="/about"');
    content = content.replace(/href="doctors\.html"/g, 'href="/doctors"');
    content = content.replace(/href="location\.html"/g, 'href="/location"');
    content = content.replace(/href="guide\.html"/g, 'href="/guide"');
    content = content.replace(/href="register_clinic\.html"/g, 'href="/register-clinic"');
    content = content.replace(/href="reservation\.html"/g, 'href="/reservation"');
    content = content.replace(/href="faq\.html"/g, 'href="/faq"');
    content = content.replace(/href="privacy\.html"/g, 'href="/privacy"');
    content = content.replace(/href="signup\.html"/g, 'href="/signup"');
    content = content.replace(/href="login\.html"/g, 'href="/login"');

    fs.writeFileSync(path.join(dir, file), content);
});

console.log('Cleanup complete for ' + files.length + ' files.');
