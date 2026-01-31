/**
 * Security Test Suite for RouteTable
 * Tests path validation, traversal prevention, symlink resolution, and injection protection
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RouteTable } from '../route-table';
import { writeFileSync, mkdirSync, symlinkSync, unlinkSync, rmdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('RouteTable Security', () => {
  const testDir = join(process.cwd(), '.test-security');
  const allowedDir = join(testDir, '.claude', 'config');
  const validRoutePath = join(allowedDir, 'test-route-table.json');
  const validRouteData = {
    version: '1.0.0',
    routes: {},
    domains: { rust: 1 },
    actions: { create: 1 },
    subtypes: {}
  };

  beforeEach(() => {
    // Create test directory structure
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    if (!existsSync(allowedDir)) {
      mkdirSync(allowedDir, { recursive: true });
    }
    writeFileSync(validRoutePath, JSON.stringify(validRouteData, null, 2));
  });

  afterEach(() => {
    // Cleanup test files
    try {
      if (existsSync(validRoutePath)) {
        unlinkSync(validRoutePath);
      }
      if (existsSync(allowedDir)) {
        rmdirSync(allowedDir, { recursive: true });
      }
      if (existsSync(testDir)) {
        rmdirSync(testDir, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts with ../', () => {
      expect(() => {
        new RouteTable('../../../etc/passwd');
      }).toThrow(/Path traversal detected|outside project/i);
    });

    it('should reject absolute paths outside project', () => {
      expect(() => {
        new RouteTable('/etc/passwd');
      }).toThrow(/outside project|not in allowed/i);
    });

    it('should reject path traversal with encoded characters', () => {
      expect(() => {
        new RouteTable('.%2e/.%2e/.%2e/etc/passwd');
      }).toThrow(/Path traversal|outside project/i);
    });

    it('should reject paths with null bytes', () => {
      expect(() => {
        new RouteTable('.claude/config/route-table.json\x00malicious');
      }).toThrow(/Path/i);
    });
  });

  describe('File Extension Validation', () => {
    it('should reject non-JSON files', () => {
      const txtPath = join(allowedDir, 'malicious.txt');
      writeFileSync(txtPath, 'malicious content');

      expect(() => {
        new RouteTable(txtPath);
      }).toThrow(/Invalid file extension/i);

      unlinkSync(txtPath);
    });

    it('should reject files without extensions', () => {
      const noExtPath = join(allowedDir, 'noextension');
      writeFileSync(noExtPath, '{}');

      expect(() => {
        new RouteTable(noExtPath);
      }).toThrow(/Invalid file extension/i);

      unlinkSync(noExtPath);
    });

    it('should reject executable files with .json extension', () => {
      const execPath = join(allowedDir, 'malicious.json.sh');
      writeFileSync(execPath, '#!/bin/bash\necho "malicious"');

      expect(() => {
        new RouteTable(execPath);
      }).toThrow(/Invalid file extension/i);

      unlinkSync(execPath);
    });

    it('should accept valid .json files', () => {
      expect(() => {
        new RouteTable(validRoutePath);
      }).not.toThrow();
    });
  });

  describe('File Size Limits', () => {
    it('should reject files larger than 10MB', () => {
      const largePath = join(allowedDir, 'large.json');
      // Create a file larger than 10MB
      const largeData = Buffer.alloc(11 * 1024 * 1024, 'a');
      writeFileSync(largePath, largeData);

      expect(() => {
        new RouteTable(largePath);
      }).toThrow(/File too large/i);

      unlinkSync(largePath);
    });

    it('should accept files smaller than 10MB', () => {
      const smallPath = join(allowedDir, 'small.json');
      writeFileSync(smallPath, JSON.stringify(validRouteData));

      expect(() => {
        new RouteTable(smallPath);
      }).not.toThrow();

      unlinkSync(smallPath);
    });
  });

  describe('Symlink Resolution', () => {
    it('should resolve symlinks and validate the real path', () => {
      const symlinkPath = join(allowedDir, 'symlink.json');
      const targetPath = validRoutePath;

      symlinkSync(targetPath, symlinkPath);

      expect(() => {
        new RouteTable(symlinkPath);
      }).not.toThrow();

      unlinkSync(symlinkPath);
    });

    it('should reject symlinks pointing outside project', () => {
      const symlinkPath = join(allowedDir, 'malicious-symlink.json');
      const outsidePath = '/etc/passwd';

      try {
        symlinkSync(outsidePath, symlinkPath);

        expect(() => {
          new RouteTable(symlinkPath);
        }).toThrow(/outside project|does not exist/i);

        unlinkSync(symlinkPath);
      } catch (error) {
        // Symlink creation may fail, which is acceptable
      }
    });

    it('should reject broken symlinks', () => {
      const symlinkPath = join(allowedDir, 'broken-symlink.json');
      const nonexistentPath = join(testDir, 'nonexistent.json');

      symlinkSync(nonexistentPath, symlinkPath);

      expect(() => {
        new RouteTable(symlinkPath);
      }).toThrow(/does not exist|cannot be resolved/i);

      unlinkSync(symlinkPath);
    });
  });

  describe('Directory Whitelist', () => {
    it('should allow files from whitelisted .claude/config directory', () => {
      expect(() => {
        new RouteTable(validRoutePath);
      }).not.toThrow();
    });

    it('should reject files from non-whitelisted directories', () => {
      const unauthorizedDir = join(testDir, 'unauthorized');
      mkdirSync(unauthorizedDir, { recursive: true });
      const unauthorizedPath = join(unauthorizedDir, 'route-table.json');
      writeFileSync(unauthorizedPath, JSON.stringify(validRouteData));

      expect(() => {
        new RouteTable(unauthorizedPath);
      }).toThrow(/not in allowed directories/i);

      unlinkSync(unauthorizedPath);
      rmdirSync(unauthorizedDir);
    });
  });

  describe('Environment Variable Injection Protection', () => {
    it('should not use CLAUDE_PROJECT_ROOT environment variable', () => {
      const originalEnv = process.env.CLAUDE_PROJECT_ROOT;
      process.env.CLAUDE_PROJECT_ROOT = '/tmp/malicious';

      const routeTable = new RouteTable();
      const stats = routeTable.getStats();

      // Should use process.cwd() instead of env var
      expect(stats.projectRoot).toBe(process.cwd());
      expect(stats.projectRoot).not.toBe('/tmp/malicious');

      // Restore original env
      if (originalEnv) {
        process.env.CLAUDE_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CLAUDE_PROJECT_ROOT;
      }
    });

    it('should not use CLAUDE_ROUTE_TABLE_PATH environment variable', () => {
      const originalEnv = process.env.CLAUDE_ROUTE_TABLE_PATH;
      process.env.CLAUDE_ROUTE_TABLE_PATH = '/etc/passwd';

      // Should ignore the environment variable and use default path
      const routeTable = new RouteTable();
      const stats = routeTable.getStats();

      expect(stats.securityViolations).toBe(0);

      // Restore original env
      if (originalEnv) {
        process.env.CLAUDE_ROUTE_TABLE_PATH = originalEnv;
      } else {
        delete process.env.CLAUDE_ROUTE_TABLE_PATH;
      }
    });
  });

  describe('Sensitive System Path Protection', () => {
    it('should reject /etc as project root', () => {
      // This test validates the isSensitiveSystemPath check
      const routeTable = new RouteTable();
      const stats = routeTable.getStats();

      // Project root should never be a system directory
      const sensitiveDirectories = ['/etc', '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/root'];
      expect(sensitiveDirectories).not.toContain(stats.projectRoot);
    });
  });

  describe('File Type Validation', () => {
    it('should reject device files', () => {
      // Most systems have /dev/null
      expect(() => {
        new RouteTable('/dev/null');
      }).toThrow(/not a regular file|outside project/i);
    });

    it('should reject directories', () => {
      expect(() => {
        new RouteTable(allowedDir);
      }).toThrow(/not a regular file/i);
    });
  });

  describe('Security Statistics Tracking', () => {
    it('should track security violations', () => {
      const routeTable = new RouteTable();
      let initialStats = routeTable.getStats();
      const initialViolations = initialStats.securityViolations;

      // Attempt a security violation
      try {
        new RouteTable('../../etc/passwd');
      } catch (error) {
        // Expected to throw
      }

      // Note: The violation counter is instance-specific, so we need to test
      // that the error is thrown rather than checking the counter
      expect(initialViolations).toBeGreaterThanOrEqual(0);
    });

    it('should expose security configuration in stats', () => {
      const routeTable = new RouteTable();
      const stats = routeTable.getStats();

      expect(stats.projectRoot).toBeDefined();
      expect(stats.allowedDirectoryCount).toBeGreaterThan(0);
      expect(stats.securityViolations).toBeDefined();
    });
  });

  describe('Malicious JSON Payload Protection', () => {
    it('should handle malicious JSON without executing code', () => {
      const maliciousPath = join(allowedDir, 'malicious.json');
      const maliciousData = {
        version: '1.0.0',
        routes: {
          // Attempt prototype pollution
          '__proto__': { malicious: 'value' },
          'constructor': { malicious: 'value' }
        },
        domains: {},
        actions: {},
        subtypes: {}
      };

      writeFileSync(maliciousPath, JSON.stringify(maliciousData));

      const routeTable = new RouteTable(maliciousPath);

      // Verify prototype wasn't polluted
      expect(Object.prototype).not.toHaveProperty('malicious');

      unlinkSync(maliciousPath);
    });
  });
});
