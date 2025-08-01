import { ManifestContentConfig, ManifestContentScript } from '@types'

export function triaging({}: ManifestContentConfig): ManifestContentScript {
  return {
    matches: [
      'https://*.pinpointhq.com/admin/jobs/*/applications',
      'https://*.pinpointhq.com/admin/jobs/*/applications/*',
      'https://*.pinpointhq.com/admin/jobs/*/stages/*/applications',
      'https://*.pinpointhq.com/admin/jobs/*/stages/*/applications/*',
    ],
    run_at: 'document_start',
    world: 'MAIN',
  }
}
