# Stillwater

A quiet place for questions and biblical reflection. Stillwater is a local, browser-based prototype featuring a dramatized Jesus-inspired character. Its voice reads prepared reflections based on biblical teachings. The app uses Scripture as a source for reflection and encourages people to turn to trusted people and professionals for personal support.

## Run locally

Use Node.js 20.19+ on the 20.x line or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Try **I feel lonely** or select **I feel alone**. Press **Enter** to send and **Shift+Enter** for a line break. Use the controls under the scene to mute the voice, replay, pause, resume, or stop. Select a Bible reference to read the verse and open its source.

```sh
npm run typecheck
npm run build
npm run preview
```

The app uses React, strict TypeScript, Vite, Three.js, React Three Fiber, and Drei. After dependency installation its main experience runs locally without a backend, API keys, tracking, or conversation storage. The optional Scripture source links open eBible.org when selected.

## What works

- A real-time WebGL courtyard with stonework, an olive tree, terracotta vessels, animated character, and desktop shadows. The scene loads separately from the interface and uses fewer leaves, a lower pixel ratio, and no shadow maps on phones and coarse-pointer devices.
- Idle breathing, paired eyelids, brief gaze shifts, a listening nod, a thinking pose, and speech-driven movement of the lips, jaw and surrounding skin. Reduced-motion mode removes ambient and head movements and softens mouth motion.
- Bundled neural narration for the five written replies, their follow-ups, and the unmatched-input message. Tracks are fetched on demand from the local app. An installed on-device English voice covers a missing or outdated recording. Replay, stop, mute, or a new prompt ends the previous playback.
- Progressive captions and mouth animation follow the audio clock and per-word timestamps. The browser voice fallback uses its word boundary events when available. The complete response remains readable during playback and when audio is unavailable.
- Five written conversation paths covering loneliness, anxiety, forgiveness, feeling like a failure, and gratitude. The demo recognizes a few short follow-up cues and explains its scope for unmatched inputs.
- Inline references that open keyboard-accessible Scripture dialogs. Prompts that match the safety rules interrupt playback and show immediate-support guidance in text.

## Prototype limits

- The courtyard is live 3D. The bundled avatar uses sculpted procedural surfaces, image-projected face and cloth detail, and a facial mesh split at the natural lip line so the original lip texture moves with the jaw. It is composed for a conversational camera and has a limited range of views and expressions. A commissioned character model would replace this stand-in for production.
- The bundled voice is synthetic and covers the scripted demo. Newly edited scripts use the browser voice until their recordings are rebuilt. The fallback selects voices the browser reports as local and English. Full written replies are available on every device.
- Lip movement is estimated from English pronunciations, vowel stress, and neighboring sounds. The recordings have word-level timing. Individual mouth shapes and exact phoneme timing remain approximate.
- The safety response relies on simple matching rules. It covers common phrases, can misread context, and can miss other descriptions of danger.
- The latest message and reflection exist in tab memory. Reloading clears the session. The WebGL fallback is a still illustration and retains the same reflection and speech interface.

## Install a professionally rigged character

1. Place a licensed, self-contained GLB at `public/models/avatar.glb`. A local GLTF also works if all of its buffers and textures are shipped alongside it. Use an uncompressed export with standard glTF materials and embedded textures where possible. Draco and Meshopt decoders are disabled to keep asset loading self-contained.
2. Create `.env.local`, set the model path, then restart the dev server or rebuild.

   ```dotenv
   VITE_AVATAR_URL=models/avatar.glb
   VITE_AVATAR_SCALE=1
   VITE_AVATAR_OFFSET_Y=0
   ```

3. Export with +Y up and the character facing +Z. The frame looks at roughly Y=1.36 and the stand-in’s eyes are around Y=1.7. Tune scale and vertical offset to bring the eyes into the same area. The courtyard and camera live in [CourtyardScene.tsx](src/scene/CourtyardScene.tsx). Model binding lives in [ModelAvatar.tsx](src/scene/ModelAvatar.tsx).
4. Use common facial target names such as `jawOpen`, `viseme_aa`, `viseme_EE`, `viseme_ou`, `viseme_PP`, `eyeBlinkLeft`, and `eyeBlinkRight`. The loader normalizes names and supports common aliases. A `Jaw` bone can drive opening when an open-mouth target is absent. A `Head` bone can receive procedural gestures.
5. Optionally export looping clips named `Idle`, `Listening`, `Thinking`, and `Speaking`. Keep speech and blink morph weights out of the clips if you want Stillwater to drive them at runtime. Check the result with reduced motion, muted playback, and a spoken reflection. A model-load failure returns to the bundled stand-in.

## Rebuild the narration

The generated audio is checked in, so running the app only requires Node. To update the recordings after editing `src/reflection/narration.json`, install [Kokoro 0.9.4](https://pypi.org/project/kokoro/0.9.4/) with Python 3.12 in a separate environment. Install the spaCy `en_core_web_sm` English model in that environment and have FFmpeg with `libmp3lame` available.

Download `config.json`, `kokoro-v1_0.pth`, and `voices/am_michael.pt` from the [model repository](https://huggingface.co/hexgrad/Kokoro-82M/tree/main) into one local directory. Run `python scripts/render_voices.py /path/to/kokoro-files` to regenerate the assets and word timing data. The script reads only the checked-in reflection text.

## Assets and licenses

| Asset | Source and terms |
| --- | --- |
| Courtyard still and portrait surface texture | Original generated artwork created for this prototype. The same local WebP supplies the still and the projected texture. |
| Geometry, stone, bark, clay textures, and Stillwater mark | Created for this project. |
| Baskervville and IBM Plex Sans | Self-hosted Fontsource variable fonts, SIL Open Font License 1.1. [Baskervville notice](public/licenses/baskervville.txt) and [IBM Plex Sans notice](public/licenses/ibm-plex-sans.txt). |
| Bundled narration | Generated locally with the [Kokoro-82M model and its stock `am_michael` voice](https://huggingface.co/hexgrad/Kokoro-82M), Apache 2.0. [License notice](public/licenses/kokoro.txt). |
| English pronunciations | A local subset of the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), with two added biblical book names and expanded numbers. [Carnegie Mellon University license](public/licenses/cmudict.txt). |
| Lucide interface icons | ISC and included upstream notices. [License](public/licenses/lucide.txt). |
| Scripture | World English Bible, updated 66-book edition, public domain. [Edition and license](https://ebible.org/engwebp/). |

Each verse is transcribed from the referenced World English Bible chapter. The dialogs link to Psalm 34:18, John 13:34, Matthew 6:34, Ephesians 4:32, Psalm 145:14, and 1 Thessalonians 5:18. The demo response text is original commentary and paraphrase.

## Roadmap

1. Add an opt-in AI backend with server-side credentials, explicit data-handling choices, and evaluated safety behavior. Retain the local scripts as a lightweight demo mode.
2. Add retrieval from a versioned public-domain Bible corpus. Return verse IDs with each answer and resolve quotations from verified source text.
3. Commission the character rig and evaluate expressive voices with phoneme timestamps for live responses. Keep bundled narration available for the demo.
# stillwater
