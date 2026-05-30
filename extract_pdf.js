const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync(path.join(__dirname, 'fb_pages.pdf'));
pdfParse(buf).then(d => {
  fs.writeFileSync(path.join(__dirname, 'pdf_text.txt'), d.text);
  console.log('Done, pages:', d.numpages);
}).catch(e => console.error(e.message));
