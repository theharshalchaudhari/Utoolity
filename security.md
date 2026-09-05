# Security and Legal Guidelines

## Overview

This document outlines the security practices, legal requirements, and usage restrictions for the Media Utility Tool. All contributors, users, and organizations must adhere to these guidelines.

## Proprietary Rights and Usage Restrictions

### Intellectual Property

This software and its source code are proprietary and confidential. Unauthorized use, reproduction, distribution, or modification of this software is strictly prohibited.

### Usage Restrictions

The following actions are strictly prohibited:

- **Reselling or Redistribution**: You may not resell, sublicense, or redistribute this software or any portion of it.
- **Commercial Use Without License**: Commercial use of this software requires explicit written permission from the copyright holder.
- **Unauthorized Modification**: You may not modify, adapt, or create derivative works without permission.
- **Reverse Engineering**: You may not reverse engineer, decompile, or disassemble any part of this software.
- **Removal of Copyright Notices**: You may not remove or alter any copyright, trademark, or proprietary notices.

### Legal Consequences

Violation of these terms may result in:

- **Legal Action**: Civil and criminal penalties may apply.
- **Damages**: Pursuit of financial damages for unauthorized use.
- **Injunction**: Court-ordered restrictions on further use.
- **Termination**: Immediate termination of access and usage rights.

### Liability Disclaimer

This software is provided "as is" without warranty of any kind. The copyright holder and contributors shall not be liable for any damages arising from the use of this software.

## General Security Principles

### Data Protection

- Never store user files permanently on the server
- Process files in memory or temporary directories
- Automatically clean up temporary files after processing
- Implement file size limits to prevent resource exhaustion
- Validate file types before processing

### File Upload Security

#### Allowed File Types

| Tool | Allowed Extensions | MIME Types |
|------|-------------------|------------|
| Video Upload | `.mp4`, `.avi`, `.mov`, `.mkv`, `.wmv`, `.flv`, `.webm`, `.mpeg`, `.m4v`, `.ts` | `video/*` |
| Image Upload | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`, `.tiff` | `image/*` |

#### Validation Requirements

```typescript
// Example file validation
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/avi', 'video/quicktime',
  'video/x-matroska', 'video/webm', 'video/mpeg'
];

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

function validateFile(file: File): ValidationResult {
  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: 'Unsupported file format' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size limit' };
  }

  // Validate file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!isValidExtension(extension, file.type)) {
    return { valid: false, error: 'File extension does not match content type' };
  }

  return { valid: true };
}
```

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# Security
NEXTAUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE_MB=1024
UPLOAD_TIMEOUT_MS=300000

# Session
SESSION_MAX_AGE=86400
```

### Security Headers

All responses must include the following security headers:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
  }
];
```

## Authentication and Authorization

### Authentication Requirements

- All tools requiring file processing must have authenticated access
- Implement session management with secure cookies
- Use HTTP-only cookies for session storage
- Implement proper logout functionality

### Authorization

```typescript
// Example route protection
import { withAuth } from 'next-auth/middleware';

export const middleware = withAuth({
  callbacks: {
    authorized({ token }) {
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    '/tools/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};
```

### Session Management

- Session timeout after 24 hours of inactivity
- Implement refresh token rotation
- Store session data securely
- Clear sessions on logout

## Input Validation

### Sanitization

- Sanitize all user inputs
- Escape output for XSS prevention
- Validate file names to prevent path traversal
- Use DOMPurify for HTML content

```typescript
// Example input sanitization
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,
  });
}

function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  return path.basename(fileName)
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255);
}
```

### SQL Injection Prevention

- Use parameterized queries
- Never concatenate user input into SQL queries
- Use ORM with built-in injection protection

### XSS Prevention

- Use React's built-in XSS protection
- Sanitize user-generated content
- Escape dynamic content
- Implement Content Security Policy

## API Security

### Rate Limiting

```typescript
// Example rate limiting
import { NextResponse } from 'next/server';

const rateLimit = new Map();

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  const requestCount = rateLimit.get(ip) || [];
  const recentRequests = requestCount.filter(time => time > now - windowMs);

  if (recentRequests.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return NextResponse.next();
}
```

### API Endpoint Security

- Validate all API inputs
- Implement proper CORS policies
- Rate limit all public endpoints
- Log all API access attempts

## File Processing Security

### Temporary File Handling

```typescript
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

class TemporaryFileManager {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async createTempFile(file: File): Promise<string> {
    const tempId = uuidv4();
    const filePath = path.join(this.tempDir, tempId);

    // Create with restricted permissions
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()), {
      mode: 0o600, // Read/Write only for owner
    });

    return filePath;
  }

  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to clean up temp file:', error);
    }
  }

  async cleanupAllTempFiles(): Promise<void> {
    const files = await fs.readdir(this.tempDir);
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const file of files) {
      const filePath = path.join(this.tempDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  }
}
```

### File Scanning

- Scan all uploaded files for malware
- Reject files with double extensions (.jpg.exe)
- Validate file signatures (magic numbers)
- Use virus scanning for production deployment

## Error Handling

### Secure Error Messages

```typescript
// Secure error handling
function handleError(error: unknown): ErrorResponse {
  // Log full error internally
  console.error('Internal error:', error);

  // Return generic error to user
  return {
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
  };
}
```

### Logging

- Log all security events
- Never log sensitive data (passwords, tokens, file contents)
- Implement audit logging for admin actions
- Use structured logging format

## Dependency Security

### Package Security

```json
// .npmrc
audit-level=high
package-lock=true
```

### Regular Audits

```bash
# Run security audit
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Check for outdated packages
pnpm outdated
```

### Version Pinning

- Pin all dependencies to specific versions
- Review all dependency updates
- Check for known vulnerabilities before updating

## Network Security

### HTTPS Enforcement

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
```

### CORS Configuration

```typescript
// API route CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## Data Privacy

### User Data Protection

- Minimize data collection
- Anonymize data when possible
- Encrypt sensitive data at rest
- Implement data retention policies
- Provide data export and deletion options

### Cookie Security

```typescript
// Cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 86400, // 24 hours
  path: '/',
};
```

## Security Checklist

### Development Phase

- [ ] All dependencies are up to date
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly configured
- [ ] Input validation implemented
- [ ] Output sanitization implemented
- [ ] File type validation implemented
- [ ] File size limits configured
- [ ] Rate limiting implemented
- [ ] Secure headers configured
- [ ] Error handling secure
- [ ] Logging implemented

### Pre-Production Phase

- [ ] Security audit performed
- [ ] Penetration testing completed
- [ ] Vulnerability scanning done
- [ ] SSL/TLS certificate installed
- [ ] HTTPS configured
- [ ] Database security reviewed
- [ ] Authentication flow tested
- [ ] Authorization rules verified
- [ ] Session management tested
- [ ] File cleanup verified

### Production Phase

- [ ] Security monitoring active
- [ ] Incident response plan ready
- [ ] Regular security updates applied
- [ ] Access logs reviewed regularly
- [ ] Security patches installed promptly
- [ ] Backup and recovery tested
- [ ] Disaster recovery plan documented

## Incident Response

### Security Incident Process

1. **Detection**: Identify the security incident
2. **Containment**: Isolate affected systems
3. **Investigation**: Determine the scope and impact
4. **Remediation**: Fix the vulnerability
5. **Recovery**: Restore affected services
6. **Communication**: Notify affected parties
7. **Documentation**: Record all actions taken
8. **Review**: Update security measures

### Contact Information

Security issues should be reported immediately to:

- **Email**: security@your-domain.com
- **Priority**: High
- **Response Time**: Within 24 hours

## Regular Security Updates

### Weekly Checks

- Review security logs
- Check for new vulnerabilities
- Verify security configurations

### Monthly Reviews

- Conduct security assessments
- Update security documentation
- Review access controls

### Quarterly Audits

- Full security audit
- Penetration testing
- Policy reviews

## Legal Compliance

### Proprietary Rights Protection

This software and its source code are protected by copyright law and international treaties. Unauthorized reproduction or distribution of this software, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under law.

### Usage Terms

By using this software, you agree to the following terms:

1. **No Resale**: You may not sell, rent, lease, or sublicense this software.
2. **No Distribution**: You may not distribute this software to third parties.
3. **No Modification**: You may not modify, adapt, or create derivative works.
4. **No Reverse Engineering**: You may not reverse engineer or decompile the software.
5. **No Removal of Notices**: You may not remove or alter any copyright notices.

### Enforcement

Violations of these terms will result in:

1. **Immediate Termination**: Access to the software will be terminated.
2. **Legal Action**: Civil and criminal proceedings may be initiated.
3. **Financial Penalties**: Damages may be sought for unauthorized use.
4. **Injunctive Relief**: Court orders to prevent further violations.

### Reporting Violations

If you become aware of any violation of these terms, please report it immediately to:

- **Email**: theharshalchaudhari@gmail.com
- **Priority**: High

## Conclusion

Security and legal compliance are fundamental to the integrity of this project. All users, contributors, and organizations must adhere to these guidelines and legal requirements. Regular reviews and updates to these guidelines are essential to address emerging security threats and legal requirements.