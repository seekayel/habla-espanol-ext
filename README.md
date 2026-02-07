# Habla Español 🇪🇸

A Chrome extension that helps you learn Spanish using spaced repetition. It blocks `news.google.com` until you correctly type a Spanish phrase shown as an image.

## Features

- **Spaced Repetition (SM-2)**: Uses the SuperMemo 2 algorithm to optimize your learning
- **100 Essential Phrases**: Curated phrases for everyday use in Mérida, Mexico
- **Fuzzy Matching**: Accepts answers with minor typos and ignores punctuation
- **Progress Tracking**: Stores your progress locally using IndexedDB
- **Beautiful UI**: Clean, focused design with smooth animations
- **Skip Option**: Small, inconspicuous skip button for when you're in a hurry
- **Practice Mode**: Click the extension icon to practice anytime without visiting blocked sites

## Usage

### Automatic Blocking
Visit `news.google.com` and you'll be prompted to type a Spanish phrase before continuing.

### Practice Mode (Testing)
Click the extension icon in your toolbar to open the popup menu:
- **Practice Now**: Opens the learning page for continuous practice
- **Test Block Page**: Same as Practice Now, with visual indicator
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
   - You should see the learning screen

## Project Structure

```
habla-espanol-ext/
├── manifest.json        # Chrome extension manifest
├── rules.json          # Declarative net request rules
├── background.js       # Service worker
├── popup.html          # Extension popup menu
├── popup.js            # Popup logic
├── block.html          # Main learning page
├── block.js            # Learning page logic
├── storage.js          # IndexedDB wrapper
├── srs.js              # Spaced repetition algorithm
├── fuzzy-match.js      # Answer validation
├── phrases.js          # Phrase data loader
├── data/
│   ├── phrases.json    # Phrase configuration (100 phrases)
│   └── phrases.md      # Original phrase list
├── icons/              # Extension icons
├── scripts/            # Build utilities
└── tests/              # Test suite
    ├── test-runner.html
    ├── test-runner.js
    ├── srs.test.js
    ├── fuzzy-match.test.js
    └── storage.test.js
```

## Configuration

### Adding New Phrases

Edit `data/phrases.json` to add or modify phrases:

```json
{
  "phrases": [
    {
      "id": 101,
      "text": "Nueva frase",
      "category": "basics",
      "english": "New phrase",
      "emoji": "🆕"
    }
  ]
}
```

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

### Blocking Flow

1. User visits `news.google.com`
2. Declarative net request redirects to `block.html`
3. Extension shows a phrase image
4. User types the Spanish phrase
5. Answer is validated with fuzzy matching
6. On success: 5-second bypass, redirect to news
7. SRS updates phrase schedule

## Development

### Modifying the UI

The block page uses Tailwind CSS (via CDN). Edit `block.html` to customize:

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

### Extension Not Blocking

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
3. Save to the `icons/` folder

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
