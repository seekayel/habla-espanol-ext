/**
 * Image Generator Script
 * Run with: node scripts/generate-images.js
 *
 * Generates illustration images for Spanish phrases using OpenAI DALL-E.
 *
 * Usage:
 *   node scripts/generate-images.js                   # all phrases missing images
 *   node scripts/generate-images.js --ids 1,2,3       # specific phrase IDs
 *   node scripts/generate-images.js --phrase "Hola"   # specific phrase by text
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OpenAI = require('openai');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const PHRASES_PATH = path.join(DATA_DIR, 'phrases.json');
const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'image-gen.txt');

/**
 * Convert phrase text to a kebab-case slug for the filename.
 */
function toSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')    // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

/**
 * Parse CLI arguments for --ids and --phrase filters.
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = { ids: null, phrase: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ids' && args[i + 1]) {
      result.ids = args[i + 1].split(',').map(Number);
      i++;
    } else if (args[i] === '--phrase' && args[i + 1]) {
      result.phrase = args[i + 1];
      i++;
    }
  }

  return result;
}

async function main() {
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found.');
    console.error('Create a .env file in the project root with:');
    console.error('  OPENAI_API_KEY=sk-...');
    process.exit(1);
  }

  // Load prompt template
  if (!fs.existsSync(PROMPT_PATH)) {
    console.error(`Error: Prompt template not found at ${PROMPT_PATH}`);
    process.exit(1);
  }
  const promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8').trim();

  // Load phrases
  const phrasesData = JSON.parse(fs.readFileSync(PHRASES_PATH, 'utf-8'));
  const allPhrases = phrasesData.phrases;

  // Parse CLI filters
  const filters = parseArgs(process.argv);

  // Determine which phrases to process
  let targetPhrases;
  if (filters.ids) {
    targetPhrases = allPhrases.filter((p) => filters.ids.includes(p.id));
    if (targetPhrases.length === 0) {
      console.error(`No phrases found with IDs: ${filters.ids.join(', ')}`);
      process.exit(1);
    }
  } else if (filters.phrase) {
    targetPhrases = allPhrases.filter(
      (p) => p.text.toLowerCase() === filters.phrase.toLowerCase()
    );
    if (targetPhrases.length === 0) {
      console.error(`No phrase found matching: "${filters.phrase}"`);
      process.exit(1);
    }
  } else {
    // All phrases missing images
    targetPhrases = allPhrases.filter((p) => {
      if (p.image) {
        const absPath = path.join(__dirname, '..', p.image);
        return !fs.existsSync(absPath);
      }
      return true;
    });
  }

  console.log(`Found ${targetPhrases.length} phrase(s) to process.\n`);

  if (targetPhrases.length === 0) {
    console.log('All phrases already have images. Nothing to do.');
    return;
  }

  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let generated = 0;
  let skipped = 0;

  for (const phrase of targetPhrases) {
    const slug = toSlug(phrase.text);
    const relPath = `src/data/images/${slug}.png`;
    const absPath = path.join(__dirname, '..', relPath);

    // Skip if image already exists on disk
    if (fs.existsSync(absPath)) {
      console.log(`[skip] ${phrase.id}. "${phrase.text}" — image exists at ${relPath}`);
      // Ensure the image field is set even if we skip generation
      const idx = allPhrases.findIndex((p) => p.id === phrase.id);
      if (idx !== -1 && !allPhrases[idx].image) {
        allPhrases[idx].image = relPath;
      }
      skipped++;
      continue;
    }

    const prompt = promptTemplate.replace('{phrase}', phrase.text);

    console.log(`[gen]  ${phrase.id}. "${phrase.text}" — generating...`);

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const imageData = response.data[0].b64_json;
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(absPath, buffer);

      // Update phrase record
      const idx = allPhrases.findIndex((p) => p.id === phrase.id);
      if (idx !== -1) {
        allPhrases[idx].image = relPath;
      }

      console.log(`       → saved ${relPath}`);
      generated++;
    } catch (err) {
      console.error(`[error] ${phrase.id}. "${phrase.text}" — ${err.message}`);
    }
  }

  // Write updated phrases.json
  phrasesData.phrases = allPhrases;
  fs.writeFileSync(PHRASES_PATH, JSON.stringify(phrasesData, null, 2) + '\n');

  console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}`);
}

main();
