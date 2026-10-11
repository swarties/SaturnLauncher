# TODO

## Main Queue:

- Onboarding step explaining (Alt + Num) navigation
- Loader Picker (Vanilla/Fabric + fabric version sub-picker)
- _app transition key => topSegment (not full pathname)
- Description wiring (UpdateInstanceDescription)
- GetInstanceIcon wiring (icon display)

## Newly unblocked (backend shipped):

- Game lifecycle events (game:started / game:stopped + exit code)
  → home page: real "Running" / "Crashed" / "Exited" state
  → launch button unlocks on game:stopped, not on StartGame resolve
- Content tabs (Mods / Resource Packs / Shader Packs)
  → InstallContent / GetInstalledContent / RemoveContent
  → shared "content tab" component, 3 instances of it
- Logs tab
  → subscribe to game:info / game:error events
  → ring buffer in stores/logs.js

## Big stuff:

- Icon picker + SetInstanceIcon wiring (Pick → Set → Get flow)

## Polishing:

- remove dead code (dev const, unused useRef, unused useRef in instances.jsx?)
- run ESLint anyway
