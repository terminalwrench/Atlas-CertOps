export const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin
export const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || ''
const configuredDocumentationUrl = (import.meta.env.VITE_DOCUMENTATION_URL as string | undefined)?.trim()
export const documentationUrl = configuredDocumentationUrl && configuredDocumentationUrl !== '/security' ? configuredDocumentationUrl : '/docs'

export function supportHref(subject: string) {
  return supportEmail ? `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}` : '/contact'
}
