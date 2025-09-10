import { isMac } from './isMac.js';

/**
 * Parses an Electron-style match string into its components
 */
function parseMatchString(matchString: string) {
  if (!matchString?.trim()) {
    return { ctrl: false, alt: false, shift: false, meta: false, key: '' };
  }

  const parts = matchString.split('+');
  const key = parts[parts.length - 1]?.toLowerCase();
  if (!key) {
    throw new Error(`Invalid accelerator: ${matchString}`);
  }

  const modifierParts = parts.slice(0, -1).map(part => part.toLowerCase());
  let ctrl = false, alt = false, shift = false, meta = false;

  for (const modifier of modifierParts) {
    switch (modifier) {
      case 'cmd':
      case 'command':
        meta = true;
        break;
      case 'ctrl':
      case 'control':
        ctrl = true;
        break;
      case 'cmdorctrl':
      case 'commandorcontrol':
        if (isMac()) {
          meta = true;
        } else {
          ctrl = true;
        }
        break;
      case 'alt':
        alt = true;
        break;
      case 'option':
        if (isMac()) {
          alt = true;
        }
        break;
      case 'shift':
        shift = true;
        break;
      case 'meta':
      case 'super':
        meta = true;
        break;
    }
  }

  return { ctrl, alt, shift, meta, key };
}

/**
 * Normalizes a key from a KeyboardEvent to match Electron's key naming
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'space',
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right',

  };

  const normalized = key.toLowerCase();
  return keyMap[normalized] || normalized;
}

/**
 * Derive a normalized base key from a KeyboardEvent, preferring `code` for letters/digits.
 * This ensures Option/Alt dead-key compositions on macOS (e.g. Option+O => 'ø')
 * still match the intended base key ('o').
 */
function normalizedEventKey(event: KeyboardEvent): string {
  // Prefer physical key for letters and digits
  const code = (event as any).code as string | undefined;
  if (code) {
    if (/^Key[A-Z]$/.test(code)) {
      // e.g. KeyO => 'o'
      return code.slice(3).toLowerCase();
    }
    if (/^Digit[0-9]$/.test(code)) {
      // e.g. Digit5 => '5'
      return code.slice(5);
    }
  }

  // Fallback to the reported key, with Electron-style normalization
  return normalizeKey(event.key);
}

/**
 * Checks if a KeyboardEvent matches an Electron accelerator string
 * 
 * @example
 * ```typescript
 * if (keymatch(event, 'CmdOrCtrl+N')) {
 *   event.preventDefault();
 *   createNewFile();
 * }
 * ```
 */
export function keymatch(event: KeyboardEvent, matchString: string): boolean {
  const { ctrl, alt, shift, meta, key } = parseMatchString(matchString);

  return normalizedEventKey(event) === key &&
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.metaKey === meta;
}
