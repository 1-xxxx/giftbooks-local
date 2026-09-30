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
8. Offers **Fast mode** for one-click cover capture, catalog checking, and a recorded voice decision followed by manual review.
9. Tracks the complete book-processing cycle, including discussion, review, and saving.

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

## Fast mode

1. Select **Fast mode** and click **Start camera** once. Allow camera, microphone, and pop-ups when requested.
2. Click **Next book** to start the first book's timer, or start with a photograph; that first cycle will start at capture.
3. Point the camera at the front cover and click **Capture cover and check**. Capture is immediate. Extraction and catalog checking start automatically.
4. Review the automatically opened catalog search. The app starts recording and transcribing the decision conversation as soon as the catalog check finishes.
5. Say a clear decision, for example **“Let's keep this book”**, **“We should give this away”**, or **“Actually, donate it.”** After 2.5 seconds without further recognized speech, the app selects the decision, stops recognition and recording, closes its catalog window, and requests focus on the app for review.
6. Check the decision, book information, and transcript manually. Correct the decision if needed, add a note, and click **Save result to Excel**.
7. Click **Next book**. The app updates that saved Excel row with the complete elapsed time and starts the next book's timer at the click.

The decision interpreter uses explicit English keep/donate phrases with simple negation and corrections; it does not perform general conversation reasoning or speaker identification. Questions, uncertain statements, and conflicting choices wait for a clearer statement or manual review. **Stop listening and review** ends listening immediately; **Listen for a decision** retries it. Recording also stops at five minutes. A retry retains the transcript but replaces the audio with the latest listening session.

Cover-only scans may not show a publication year, ISBN, or edition. The app flags an unverified edition when a title match lacks a scanned year or ISBN. Use traditional mode and photograph the copyright page when exact-edition evidence is needed.

Pop-up and window-focus behavior depend on the browser. If a catalog window or automatic return is blocked, use the inline catalog link and return to the GiftBooks window manually. Speech recognition needs browser support and microphone permission; manual decisions remain available when recognition fails.

## Traditional mode

Traditional mode is the default and keeps the original multi-photo, manually triggered checking workflow. The selected mode is remembered in the browser.

1. Click **Start camera**.
2. Choose the part of the book being photographed, such as **title page** or **copyright page**.
3. Click **Take photo**. The picture is taken immediately, with no countdown.
4. Photograph at least the title page. Add the copyright or publication page when the edition and year matter.
5. Click **Extract and check Illinois Library Catalog**.

<img width="1065" height="892" alt="Screenshot 2026-09-25 at 12 15 40 PM" src="https://github.com/user-attachments/assets/c0d4301d-0d65-42b9-8963-7a41ac90402e" />

6. The app automatically opens the Illinois Library Catalog search in another tab after extraction.
7. Review the extracted information and catalog result.

<img width="1074" height="635" alt="Screenshot 2026-09-25 at 12 22 56 PM" src="https://github.com/user-attachments/assets/2088031f-48e4-496f-a93d-2600acf27bc5" />

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

Browser speech recognition support varies. Select **Require on-device speech recognition** to require local processing. If the browser cannot enforce local recognition or the language pack is unavailable, recognition fails visibly instead of silently using a remote service. When this setting is off, the browser may use an online speech service.

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
- Total processing time from one **Next book** click to the next (the first book starts at capture unless you click **Next book** first)
- UTC timestamp

The app creates the workbook automatically. Close the workbook in Excel before saving another result if Excel prevents the file from being updated.

At **Save result to Excel**, processing time is provisional. **Next book** finalizes the same row, including review, saving, and the time up to that click; it does not append a duplicate. Click **Next book** after the last saved book as well, before closing the app. If updating the workbook fails, the app keeps the current book so you can close Excel and retry. Clearing photos does not restart a running timer. Starting an unsaved next book discards that book's recording and does not create an Excel row.

Recorded audio and timestamped transcripts are saved with the result under `data/conversations/`, named using the Excel scan ID. Audio is saved when the browser supports MediaRecorder and microphone recording; otherwise the recognized transcript is saved. Recordings are not saved if you discard the book without saving its result.

## Speed improvements

- Camera capture has no countdown.
- Model loading starts when the camera is started, overlapping camera setup and positioning; the loaded model is reused.
- ISBN and title searches run concurrently, using reusable HTTP connections. A failed request is reported as an error rather than a partial Not Found result.
- Image normalization reads from memory instead of writing and rereading a source file.
- Fast mode uses a maximum image edge of 1400 pixels; traditional mode retains 1800 pixels. Small or blurry cover text may need the larger setting. Override with `GIFTBOOKS_FAST_IMAGE_SIZE=1800 python giftbooks_local_v2.py` (allowed range: 1000–1800).

Local-model inference speed still depends on the Mac, model, and photograph. No live Mac benchmark is claimed. Automatic book detection, image-role classification, and labeled-image training remain deferred.

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
- Decision audio and transcripts are stored locally when the scan is saved. Recording is visible in the interface and stops before final review.

## Development checks

Backend regression tests use the real Flask, Pillow, and Excel libraries with a stub for Mac-only MLX:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
```

Interface tests use Node 22+ and jsdom, with simulated camera, microphone, recognition, catalog responses, and clock:

```bash
npm install --no-save --package-lock=false jsdom
node --test tests/workflow.test.cjs
```

These checks exercise state transitions, saving, recording, failures, and timing. Test camera capture, actual speech recognition, catalog-window focus, and local-model accuracy on the target Mac before relying on the faster image setting.

## Project files

- `giftbooks_local_v2.py` - complete Flask application, interface, local-model workflow, and embedded result sounds
- `requirements.txt` - Python packages required by the app
- `data/illinois_library_scan_results.xlsx` - created automatically after the first saved result
