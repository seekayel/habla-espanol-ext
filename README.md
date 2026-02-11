# Habla Español 🇪🇸

A Chrome extension that helps you learn Spanish using spaced repetition. It shows a quiz screen on `news.google.com` until you correctly type a Spanish phrase shown as an image.

## Features

- **Spaced Repetition (SM-2)**: Uses the SuperMemo 2 algorithm to optimize your learning
- **100 Essential Phrases**: Curated phrases for everyday use in Mérida, Mexico
- **Fuzzy Matching**: Accepts answers with minor typos and ignores punctuation
- **Progress Tracking**: Stores your progress locally using IndexedDB
- **Beautiful UI**: Clean, focused design with smooth animations
- **Skip Option**: Small, inconspicuous skip button for when you're in a hurry
- **Practice Mode**: Click the extension icon to practice anytime without triggering the quiz screen

## Usage

### Automatic Quiz
Visit `news.google.com` and you'll see a quiz screen prompting you to type a Spanish phrase before continuing.

### Practice Mode (Testing)
Click the extension icon in your toolbar to open the popup menu:
- **Practice Now**: Opens the quiz screen for continuous practice
- **Test Quiz Screen**: Same as Practice Now, with visual indicator
- **Reset Progress**: Clears all learning data (use with caution)
- **Run Tests**: Opens the test runner for development

In Practice Mode:
- A green "Practice Mode" badge appears in the top-left corner
- Correct answers load the next phrase instead of redirecting
- Click "Exit" to close the practice session

## Installation

### From Source (Developer Mode)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/seekayel/habla-espanol-ext.git
   cd habla-espanol-ext
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/` in Chrome
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `habla-espanol-ext` folder
   - The extension icon should appear in your toolbar

5. **Test it**
   - Visit `https://news.google.com`
   - You should see the quiz screen

## CLI Tools

The project includes Node.js scripts for generating assets. Install dependencies first:

```bash
npm install
```

### Generate Phrase Images

Uses OpenAI DALL-E 3 to generate illustration images for the flashcard phrases.

**Setup:**

```bash
echo "OPENAI_API_KEY=sk-..." > .env
```

**Usage:**

```bash
# Generate images for all phrases that don't have one yet
npm run generate-images

# Generate images for specific phrase IDs
npm run generate-images -- --ids 1,2,3

# Generate image for a specific phrase by text
npm run generate-images -- --phrase "Hola"
```

The script:
- Reads the prompt template from `prompts/image-gen.txt`
- Calls DALL-E 3 for each phrase and saves the PNG to `src/data/images/`
- Updates `src/data/phrases.json` with the `image` path for each generated phrase
- Skips phrases that already have an image on disk (safe to re-run)

### Import Phrases

Imports phrases and complexity scores from a markdown table into `src/data/phrases.json`. Matches existing phrases by comparing lowercase text; updates matched phrases with the complexity score, and appends unmatched phrases as new entries.

```bash
# Import from phrases.md at the project root
npm run import-phrases -- phrases.md

# Import from any markdown file with a | Frase | Complejidad | table
npm run import-phrases -- path/to/file.md
```

The markdown file should contain a table like:

```markdown
| Frase | Complejidad |
|---|---|
| Hola | 0 |
| Buenos días | 1 |
```

### Generate Extension Icons

Creates placeholder SVG icons for the extension.

```bash
node scripts/generate-icons.js
```

## Project Structure

```
habla-espanol-ext/
├── manifest.json        # Chrome extension manifest
├── rules.json           # Declarative net request rules
├── package.json         # Node.js dependencies for CLI tools
├── src/                 # Extension runtime files
│   ├── background.js    # Service worker
│   ├── content-script.js # Content script (overlay + iframe)
│   ├── popup.html       # Extension popup menu
│   ├── popup.js         # Popup logic
│   ├── quiz.html        # Quiz screen
│   ├── quiz.js          # Quiz screen logic
│   ├── storage.js       # IndexedDB wrapper
│   ├── srs.js           # Spaced repetition algorithm
│   ├── fuzzy-match.js   # Answer validation
│   ├── phrases.js       # Phrase data loader
│   ├── data/
│   │   ├── phrases.json # Phrase configuration (100 phrases)
│   │   ├── phrases.md   # Original phrase list
│   │   └── images/      # Generated phrase images (PNG)
│   └── icons/           # Extension icons
├── prompts/
│   └── image-gen.txt    # DALL-E prompt template
├── scripts/
│   ├── generate-images.js  # DALL-E image generator CLI
│   ├── generate-icons.js   # Extension icon generator
│   └── import-phrases.js   # Phrase importer from markdown tables
└── tests/               # Test suite
    ├── test-runner.html
    ├── test-runner.js
    ├── srs.test.js
    ├── fuzzy-match.test.js
    └── storage.test.js
```

## Configuration

### Adding New Phrases

Edit `src/data/phrases.json` to add or modify phrases:

```json
{
  "phrases": [
    {
      "id": 101,
      "text": "Nueva frase",
      "category": "basics",
      "english": "New phrase",
      "emoji": "🆕",
      "complexity": 2
    }
  ]
}
```

You can also bulk-import phrases from a markdown file using `npm run import-phrases` (see [Import Phrases](#import-phrases) above).

### Categories

Phrases are organized into categories with colors and emojis:

- `basics` - Lo Básico (greetings, please, thank you)
- `greetings` - Presentaciones y Cortesía
- `communication` - Comunicación
- `directions` - Direcciones y Transporte
- `food` - Comida y Bebida
- `shopping` - Compras y Dinero
- `daily` - Necesidades Cotidianas
- `time` - Tiempo y Horarios
- `extras` - Frases Útiles Extra

## Testing

### Running Tests in Browser

1. Open `tests/test-runner.html` in a browser
2. Click "Run Tests"
3. View results in the output area

### Test Coverage

- **SRS Algorithm Tests**: Interval calculations, ease factor, scheduling
- **Fuzzy Match Tests**: Normalization, Levenshtein distance, matching rules
- **Storage Tests**: IndexedDB operations, progress tracking

## How It Works

### Spaced Repetition (SM-2 Algorithm)

The extension uses the SuperMemo 2 algorithm:

1. **First review**: 1 day interval
2. **Second review**: 6 days interval
3. **Subsequent reviews**: Previous interval × Ease Factor
4. **Incorrect answer**: Reset to 1 day interval
5. **Ease Factor**: Adjusts based on performance (min 1.3, start 2.5)

### Answer Matching

Answers are validated with fuzzy matching:

- Case insensitive (`HOLA` matches `hola`)
- Punctuation ignored (`¿Cómo estás?` matches `Como estas`)
- Accents flexible by default (`años` matches `anos`)
- Minor typos allowed (1 error per 5 characters)

### Quiz Flow

1. User visits `news.google.com`
2. Declarative net request redirects to `quiz.html`
3. Quiz screen shows a phrase image
4. User types the Spanish phrase
5. Answer is validated with fuzzy matching
6. On success: 5-second bypass, redirect to news
7. SRS updates phrase schedule

## Development

### Modifying the UI

The quiz screen uses Tailwind CSS (via CDN). Edit `quiz.html` to customize:

- Colors defined in `tailwind.config` section
- Animations in the `<style>` block
- Layout in the HTML structure

### Modifying the Algorithm

Edit `srs.js` to change:

- Initial ease factor (default 2.5)
- Minimum ease factor (default 1.3)
- First interval (default 1 day)
- Second interval (default 6 days)

### Modifying Matching Rules

Edit `fuzzy-match.js` to change:

- `normalize()`: String preprocessing
- `match()`: Matching thresholds
- `getFeedback()`: User feedback messages

## Troubleshooting

### Quiz Screen Not Showing

1. Check that the extension is enabled in `chrome://extensions/`
2. Verify that `news.google.com` matches the rule pattern
3. Check the console for errors (right-click extension → Inspect views)

### Data Not Persisting

1. IndexedDB may be disabled or blocked
2. Check browser privacy settings
3. Try clearing extension storage and reloading

### Icons Not Showing

The extension includes PNG icons. If they're missing:

1. Open `scripts/create-icons.html` in a browser
2. Right-click each canvas and save as PNG
3. Save to the `src/icons/` folder

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`tests/test-runner.html`)
5. Submit a pull request

## Credits

- **SM-2 Algorithm**: Based on [SuperMemo](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- **Phrases**: 100 essential phrases for Mérida, Yucatán, Mexico
- **Design**: Clean, focused UI with Tailwind CSS
