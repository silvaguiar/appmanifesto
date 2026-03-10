import fs from 'fs';

async function fetchDocs() {
  try {
    const res = await fetch('https://focusnfe.com.br/doc/mdfe.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await res.text();
    fs.writeFileSync('focus_mdfe_docs.html', text);
    console.log("Docs saved to focus_mdfe_docs.html");
  } catch(e) {
    try {
      const res2 = await fetch('https://focusnfe.com.br/api/mdfe.html', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      const text2 = await res2.text();
      fs.writeFileSync('focus_mdfe_docs.html', text2);
      console.log("Docs saved to focus_mdfe_docs.html (fallback)");
    } catch(e2) {
      console.error("Failed completely", e2);
    }
  }
}
fetchDocs();
