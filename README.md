# Text to Dash - Figma Plugin

**Text to Dash** is a Figma plugin designed to transform text layers (supporting both Latin and Cyrillic character sets) into custom stylized dashed vector outlines. It precisely traces the outlines/glyphs of selected text layers, converting them into vector paths with highly customizable dashed stroke patterns.

To ensure a non-destructive design workflow, the plugin preserves your original text layers intact and places the generated dashed graphics adjacent to the source selection.

## Features

- **Glyph-Precise Tracing**: Converts text geometry to vector paths while retaining the exact styling and curves of the original font glyphs.
- **Bi-lingual Support**: Full support for both Latin and Cyrillic alphabets, working across a wide range of standard and custom fonts.
- **Non-Destructive Execution**: Preserves the original text layer in its original position and inserts the newly created dashed version next to it.
- **Advanced Customization Panel**:
  - **Dash Size (Length)**: Adjust the length of each individual dash segment.
  - **Dash Gap (Spacing)**: Change the distance/gap between the dashes.
  - **Dash Roundness (Cap Style)**: Toggle between sharp/flat endings or completely rounded caps.
  - **Dash Rotation/Orientation**: Control the rotation offset of dashes relative to the path tangent.

## Tech Stack & Architecture

- **Figma Plugin API**: Manifest v2, utilizing background logic (`code.ts`) and a responsive UI iframe (`ui.html`).
- **TypeScript**: Ensuring type safety and reliable interaction with the Figma node model.
- **Opentype.js (or Figma outline vectors)**: Leveraging vector geometry parsing to extract precise glyph path boundaries.
- **Vanilla HTML/CSS/JS**: Lightweight, modern, and beautiful user interface for setting control parameters.
