/**
 * Checks if the current platform is macOS using `navigator.platform`.
 */
export function isMac() {
	return navigator.platform.toLowerCase().includes('mac');
}
