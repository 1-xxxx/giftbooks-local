# GiftBooks Local

GiftBooks Local uses your Mac's camera and a local vision model to identify a book and check whether the same edition appears in the Illinois Library Catalog.

The book images are analyzed on your Mac. No Gemini, OpenAI, or other paid AI API is required.

## What it does

1. Takes photographs from your camera or accepts existing image files.
2. Extracts the title, author, publication year, edition, publisher, language, and ISBN when visible.
3. Searches the Illinois Library Catalog for the same book and edition.
4. Shows **Found** with a direct catalog-record link, or **Not Found** with the original catalog-search link for manual checking.
5. Lets you mark the physical book as **Keep** or **Give away** and add an optional note of up to 20 words.
6. Saves each completed scan to an Excel workbook.
7. Supports voice commands and plays different sounds for found and not-found results.

## What you need

- A Mac with Apple silicon. An M-series Mac with at least 16 GB of memory is recommended.
- macOS with Python 3.11 or newer.
- Internet access for the first model download and Illinois Library Catalog searches.
- A camera and microphone if you want camera capture and voice control.
- About 8-12 GB of free storage for Python packages and the local model cache.

The first run is slower because the model must download and load. Later runs should start faster.

## Install

Open Terminal and run:

```bash
git clone https://github.com/1-xxxx/giftbooks-local.git
cd giftbooks-local
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

This method does not require downloading or unzipping a ZIP file.

## Start the app

Each time you use the app, open Terminal, enter the project folder, activate the environment, and run the program:

```bash
cd giftbooks-local
source .venv/bin/activate
python giftbooks_local_v2.py
```

The app normally opens automatically at:

```text
http://127.0.0.1:8502
```

Allow camera and microphone access when the browser asks.

## Scan a book

1. Click **Start camera**.
2. Choose the part of the book being photographed, such as **title page** or **copyright page**.
3. Click **Take photo**. A countdown runs from 1.0 to 0.0 seconds.
4. Photograph at least the title page. Add the copyright or publication page when the edition and year matter.
5. Click **Extract and check Illinois Library Catalog**.
6. The app automatically opens the Illinois Library Catalog search in another tab after extraction.
7. Review the extracted information and catalog result.
8. If the result is not found, use **Open the Illinois Library Catalog search to verify** for a manual check.
9. Choose **Keep** or **Give away**.
10. Add an optional note of no more than 20 words.
11. Click **Save result to Excel**, then choose **Next book**.

You can also upload JPEG, PNG, WebP, HEIC, or HEIF photographs instead of using the camera.

## Voice control

Click **Enable hands-free mode**, or press Enter while you are not typing in a field.

Useful commands include:

- `title page`
- `copyright page`
- `front cover`
- `back cover`
- `spine`
- `take photo` or `photo`
- `remove last photo`
- `clear photos`
- `check library`
- `read result`
- `keep book`
- `give away`
- `set note followed by your note`
- `clear note`
- `save result`
- `next book`
- `stop listening`

Browser speech recognition support varies. When available, select **Require on-device recognition when supported** to prefer local recognition. Some browsers may still use an online speech service.

## Excel results

Saved results appear here:

```text
data/illinois_library_scan_results.xlsx
```

The workbook contains one row per saved scan, including:

- Locally extracted book information
- Detected language
- Found or Not Found status
- Direct record URL when found
- Catalog search URL when not found
- Keep or Give Away decision
- Optional note
- Processing time
- UTC timestamp

The app creates the workbook automatically. Close the workbook in Excel before saving another result if Excel prevents the file from being updated.

## Stop the app

Return to the Terminal window running the program and press:

```text
Control + C
```

## Common problems

### Port 8502 is already in use

Another copy of the app may still be running. Find it with:

```bash
lsof -nP -iTCP:8502 -sTCP:LISTEN
```

Use the PID shown in the output:

```bash
kill PID
```

Or start this copy on another port:

```bash
GIFTBOOKS_PORT=8503 python giftbooks_local_v2.py
```

Then open `http://127.0.0.1:8503`.

### The camera or microphone does not work

- Confirm that the browser has camera and microphone permission in macOS System Settings.
- Try Safari or Chrome.
- Close other programs that may be using the camera.
- You can still upload photographs if camera access is unavailable.

### The first scan takes a long time

The local model must download and load during the first run. Photograph only the pages needed for identification. The title page plus copyright page usually gives the best balance of speed and accuracy.

### The catalog search tab does not open

Allow pop-ups from `127.0.0.1` in your browser. The result card also contains a catalog link you can open manually.

### A book is incorrectly reported as not found

- Check the extracted title, author, year, and edition.
- Correct those fields and select **Search Illinois Library Catalog again**.
- Open the provided catalog-search link and inspect the results manually.
- Photograph the title page and copyright page more clearly.

## Privacy

- Book-image analysis runs locally on your Mac.
- Catalog search terms are sent to the Illinois Library Catalog.
- Browser voice recognition may use an online service, depending on the browser and settings.
- Scan results are stored locally in the Excel workbook.

## Project files

- `giftbooks_local_v2.py` - complete Flask application, interface, local-model workflow, and embedded result sounds
- `requirements.txt` - Python packages required by the app
- `data/illinois_library_scan_results.xlsx` - created automatically after the first saved result
