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
- On-device English voice discovery and selection, with preference given to natural-sounding installed voices. The app cancels prior speech on replay, stop, mute, or submission of a new prompt.
- Progressive captions follow word boundary events when available and estimate timing between events. The complete response is always available as text. The app keeps working with silent captions or immediate text when speech is unavailable.
- Five written conversation paths covering loneliness, anxiety, forgiveness, feeling like a failure, and gratitude. The demo recognizes a few short follow-up cues and explains its scope for unmatched inputs.
- Inline references that open keyboard-accessible Scripture dialogs. Prompts that match the safety rules interrupt playback and show immediate-support guidance in text.

## Prototype limits

- The courtyard is live 3D. The bundled avatar uses sculpted procedural surfaces, image-projected face and cloth detail, and a facial mesh split at the natural lip line so the original lip texture moves with the jaw. It is composed for a conversational camera and has a limited range of views and expressions. A commissioned character model would replace this stand-in for production.
- Web Speech API voice quality and pause, resume, and boundary event support depend on the installed voices and browser. The app selects only voices the browser reports as both local and English. With no compatible voice, captions and the full written reply remain available.
- Lip movement is estimated from English pronunciations, vowel stress, and the shapes of neighboring sounds. Browser word boundaries help fit the pace to the voice. Motion can still drift when a browser supplies few events or a voice pronounces a word differently.
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

## Assets and licenses

| Asset | Source and terms |
| --- | --- |
| Courtyard still and portrait surface texture | Original generated artwork created for this prototype. The same local WebP supplies the still and the projected texture. |
| Geometry, stone, bark, clay textures, and Stillwater mark | Created for this project. |
| Baskervville and IBM Plex Sans | Self-hosted Fontsource variable fonts, SIL Open Font License 1.1. [Baskervville notice](public/licenses/baskervville.txt) and [IBM Plex Sans notice](public/licenses/ibm-plex-sans.txt). |
| English pronunciations | A local subset of the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), with two added biblical book names and expanded numbers. [Carnegie Mellon University license](public/licenses/cmudict.txt). |
| Lucide interface icons | ISC and included upstream notices. [License](public/licenses/lucide.txt). |
| Scripture | World English Bible, updated 66-book edition, public domain. [Edition and license](https://ebible.org/engwebp/). |

Each verse is transcribed from the referenced World English Bible chapter. The dialogs link to Psalm 34:18, John 13:34, Matthew 6:34, Ephesians 4:32, Psalm 145:14, and 1 Thessalonians 5:18. The demo response text is original commentary and paraphrase.

## Roadmap

1. Add an opt-in AI backend with server-side credentials, explicit data-handling choices, and evaluated safety behavior. Retain the local scripts as a lightweight demo mode.
2. Add retrieval from a versioned public-domain Bible corpus. Return verse IDs with each answer and resolve quotations from verified source text.
3. Commission the character rig and evaluate higher-quality synthetic voices that supply timing data for smoother visemes and captions. Keep a local voice option.
# stillwater
