export function isPlaintextStorageAllowed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DISHA_ALLOW_PLAINTEXT_CREDENTIALS === '1'
  )
}

export function plaintextStorageDeniedMessage(): string {
  return [
    'Secure credential storage is unavailable on this platform.',
    'Set DISHA_ALLOW_PLAINTEXT_CREDENTIALS=1 only for local development,',
    'or configure an OS-backed secret store before running in production.',
  ].join(' ')
}
