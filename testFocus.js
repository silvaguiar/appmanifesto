const fs = require('fs');

async function test() {
    const payload = JSON.parse(fs.readFileSync('payload.json', 'utf8'));
    
    // Testing different tpEmit fields
    payload.tipo_emitente = 2; // Test as integer
    
    try {
        const res = await fetch('http://localhost:3456/v2/mdfe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log("RESPONSE:", JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
