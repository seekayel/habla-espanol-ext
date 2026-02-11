/**
 * Import Phrases Script
 * Run with: node scripts/import-phrases.js <path-to-markdown-file>
 *
 * Imports phrases from a markdown table with columns: Frase | Complejidad
 * Upserts into src/data/phrases.json, matching by toLowerCase() on both sides.
 * New phrases are appended with the next available ID.
 */

const fs = require('fs');
const path = require('path');

const PHRASES_PATH = path.join(__dirname, '..', 'src', 'data', 'phrases.json');

/**
 * Parse a markdown file containing a table with Frase and Complejidad columns.
 * Returns an array of { text, complexity } objects.
 */
function parseMarkdownTable(content) {
  const lines = content.split('\n');
  const results = [];

  // Find the header row
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('|') && trimmed.toLowerCase().includes('frase')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Error: Could not find table header with "Frase" column.');
    process.exit(1);
  }

  // Skip separator row (e.g. |---|---|)
  const dataStart = headerIndex + 2;

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;

    const text = cells[0].trim();
    const complexity = parseInt(cells[1], 10);

    if (text && !isNaN(complexity)) {
      results.push({ text, complexity });
    }
  }

  return results;
}

function main() {
  const mdPath = process.argv[2];
  if (!mdPath) {
    console.error('Usage: node scripts/import-phrases.js <path-to-markdown-file>');
    console.error('');
    console.error('The markdown file should contain a table like:');
    console.error('  | Frase | Complejidad |');
    console.error('  |---|---|');
    console.error('  | Hola | 0 |');
    process.exit(1);
  }

  const resolvedPath = path.resolve(mdPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Read and parse the markdown file
  const mdContent = fs.readFileSync(resolvedPath, 'utf-8');
  const incoming = parseMarkdownTable(mdContent);
  console.log(`Parsed ${incoming.length} phrase(s) from ${path.basename(resolvedPath)}`);

  if (incoming.length === 0) {
    console.log('No phrases to import.');
    return;
  }

  // Load existing phrases.json
  const phrasesData = JSON.parse(fs.readFileSync(PHRASES_PATH, 'utf-8'));
  const phrases = phrasesData.phrases;

  // Build a lookup map: lowercase text -> index in phrases array
  const lookup = new Map();
  for (let i = 0; i < phrases.length; i++) {
    lookup.set(phrases[i].text.toLowerCase(), i);
  }

  let nextId = Math.max(...phrases.map(p => p.id)) + 1;
  let updated = 0;
  let inserted = 0;

  for (const item of incoming) {
    const key = item.text.toLowerCase();
    const existingIndex = lookup.get(key);

    if (existingIndex !== undefined) {
      // Update existing phrase with complexity
      phrases[existingIndex].complexity = item.complexity;
      updated++;
    } else {
      // Insert new phrase
      const newPhrase = {
        id: nextId++,
        text: item.text,
        complexity: item.complexity
      };
      phrases.push(newPhrase);
      lookup.set(key, phrases.length - 1);
      inserted++;
    }
  }

  // Write updated phrases.json
  phrasesData.phrases = phrases;
  fs.writeFileSync(PHRASES_PATH, JSON.stringify(phrasesData, null, 2) + '\n');

  console.log(`Done. Updated: ${updated}, Inserted: ${inserted}`);
}

main();
