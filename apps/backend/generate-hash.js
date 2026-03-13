const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hash pour admin123:');
    console.log(hash);
}

generateHash();
