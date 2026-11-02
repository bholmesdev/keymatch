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

	const modifierParts = parts.slice(0, -1).map((part) => part.toLowerCase());
	let ctrl = false,
		alt = false,
		shift = false,
		meta = false;

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
		arrowup: 'up',
		arrowdown: 'down',
		arrowleft: 'left',
		arrowright: 'right',
	};

	const normalized = key.toLowerCase();
	return keyMap[normalized] || normalized;
}

/**
 * Derive a normalized base key from a KeyboardEvent.
 *
 * Letters and digits follow the character the active keyboard layout produces
 * (`key`), so on Dvorak, Colemak or AZERTY a shortcut spelled `CmdOrCtrl+B`
 * fires from the key that types "b", not from the key at QWERTY's B position.
 *
 * The physical key (`code`) is used only when:
 * - Alt is held (Option dead keys such as Option+O => 'ø'), so Alt shortcuts
 *   still match by key position on every layout.
 * - the key produces something other than an ASCII letter or digit on a letter
 *   or digit key: a non-ASCII letter (Cyrillic), punctuation (',' on Dvorak's
 *   KeyW, so Cmd+, there still matches `CmdOrCtrl+W`), or the symbol on a
 *   Shifted digit key ('@' on Digit2).
 *
 * Like native macOS apps, non-Latin layouts fall back to the key position.
 *
 * Anything else (Enter, arrows, Delete, `Dead`, `Unidentified`) goes to
 * `normalizeKey(key)` as before.
 */
function normalizedEventKey({ code, key, altKey }: KeyboardEvent): string {
	if (!altKey && /^[a-zA-Z0-9]$/.test(key)) {
		// e.g. 'B' on Dvorak => 'b'
		return key.toLowerCase();
	}

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
	return normalizeKey(key);
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

	return (
		normalizedEventKey(event) === key &&
		event.ctrlKey === ctrl &&
		event.altKey === alt &&
		event.shiftKey === shift &&
		event.metaKey === meta
	);
}
