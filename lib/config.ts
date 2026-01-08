const DEFAULT_API_BASE_URL = "https://api.jkmcopilot.com"

export function resolveApiBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_API_BASE ||
		process.env.NEXT_PUBLIC_API_BASE_URL ||
		process.env["VITE_API_BASE"] ||
		DEFAULT_API_BASE_URL
	)
}

export const API_BASE_URL = resolveApiBaseUrl()

export function debugLogApiBaseUrl(tag = "API_BASE_URL") {
	if (typeof window === "undefined") return
	const key = `__jkm_api_base_logged__${tag}`
	if ((window as any)[key]) return
	;(window as any)[key] = true
	// eslint-disable-next-line no-console
	console.info(`[JKM] ${tag}:`, API_BASE_URL)
}
