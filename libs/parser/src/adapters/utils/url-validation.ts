export function isSafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    
    // Only allow http and https
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    // SSRF mitigations: reject obvious localhost/private patterns in the hostname
    const host = u.hostname.toLowerCase();
    
    // Reject explicit localhost, loopback, metadata IPs
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254'
    ) {
      return false;
    }

    // Reject IP ranges (simple string check for the common private blocks)
    // In a fully hardened environment, this would do async DNS resolution, 
    // but this covers the synchronous add-time and sync-time basic checks.
    if (
      host.startsWith('10.') || 
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
