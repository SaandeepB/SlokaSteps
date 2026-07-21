import { useEffect } from 'react'

/** Sets a meaningful page title of the form "<page> — Sloka Steps". */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} — Sloka Steps`
  }, [pageTitle])
}
