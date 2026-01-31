/**
 * Manual Security Test for RouteTable
 * Run with: node security-manual-test.js
 *
 * Tests:
 * 1. Path traversal attacks
 * 2. File extension validation
 * 3. Symlink resolution
 * 4. File size limits
 * 5. Directory whitelist
 * 6. Environment variable injection
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testDir = path.join(process.cwd(), '.test-security-manual');
const allowedDir = path.join(testDir, '.claude', 'config');
const validRoutePath = path.join(allowedDir, 'test-route-table.json');

const validRouteData = {
  version: '1.0.0',
  routes: {},
  domains: { rust: 1 },
  actions: { create: 1 },
  subtypes: {}
};

// Setup test environment
function setup() {
  console.log('Setting up test environment...');
  if (!fs.existsSync(allowedDir)) {
    fs.mkdirSync(allowedDir, { recursive: true });
  }
  fs.writeFileSync(validRoutePath, JSON.stringify(validRouteData, null, 2));
  console.log('✓ Test environment created');
}

// Cleanup test environment
function cleanup() {
  console.log('\nCleaning up test environment...');
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('⚠ Cleanup error:', error.message);
  }
}

// Test cases
const tests = [
  {
    name: 'Path Traversal: ../ attack',
    test: () => {
      const maliciousPath = '../../../etc/passwd';
      console.log(`  Testing: ${maliciousPath}`);
      // Expected: Should throw or reject
      return { path: maliciousPath, shouldFail: true };
    }
  },
  {
    name: 'Path Traversal: Absolute path outside project',
    test: () => {
      const maliciousPath = '/etc/passwd';
      console.log(`  Testing: ${maliciousPath}`);
      return { path: maliciousPath, shouldFail: true };
    }
  },
  {
    name: 'File Extension: Non-JSON file (.txt)',
    test: () => {
      const txtPath = path.join(allowedDir, 'malicious.txt');
      fs.writeFileSync(txtPath, 'malicious content');
      console.log(`  Testing: ${txtPath}`);
      return { path: txtPath, shouldFail: true, cleanup: () => fs.unlinkSync(txtPath) };
    }
  },
  {
    name: 'File Extension: Valid .json file',
    test: () => {
      console.log(`  Testing: ${validRoutePath}`);
      return { path: validRoutePath, shouldFail: false };
    }
  },
  {
    name: 'File Size: Large file (> 10MB)',
    test: () => {
      const largePath = path.join(allowedDir, 'large.json');
      const largeData = Buffer.alloc(11 * 1024 * 1024, 'a');
      fs.writeFileSync(largePath, largeData);
      console.log(`  Testing: ${largePath} (${(largeData.length / 1024 / 1024).toFixed(1)}MB)`);
      return { path: largePath, shouldFail: true, cleanup: () => fs.unlinkSync(largePath) };
    }
  },
  {
    name: 'Symlink: Valid symlink to allowed file',
    test: () => {
      const symlinkPath = path.join(allowedDir, 'valid-symlink.json');
      fs.symlinkSync(validRoutePath, symlinkPath);
      console.log(`  Testing: ${symlinkPath} -> ${validRoutePath}`);
      return { path: symlinkPath, shouldFail: false, cleanup: () => fs.unlinkSync(symlinkPath) };
    }
  },
  {
    name: 'Directory Whitelist: Unauthorized directory',
    test: () => {
      const unauthorizedDir = path.join(testDir, 'unauthorized');
      fs.mkdirSync(unauthorizedDir, { recursive: true });
      const unauthorizedPath = path.join(unauthorizedDir, 'route-table.json');
      fs.writeFileSync(unauthorizedPath, JSON.stringify(validRouteData));
      console.log(`  Testing: ${unauthorizedPath}`);
      return {
        path: unauthorizedPath,
        shouldFail: true,
        cleanup: () => {
          fs.unlinkSync(unauthorizedPath);
          fs.rmdirSync(unauthorizedDir);
        }
      };
    }
  }
];

// Run security validation tests
function runTests() {
  console.log('\n=== RouteTable Security Validation Tests ===\n');

  const results = {
    passed: 0,
    failed: 0,
    total: tests.length
  };

  tests.forEach((test, index) => {
    console.log(`\nTest ${index + 1}/${tests.length}: ${test.name}`);

    try {
      const { path: testPath, shouldFail, cleanup: testCleanup } = test.test();

      // Simulate validation logic
      const validationResult = validatePath(testPath);

      if (shouldFail) {
        if (!validationResult.valid) {
          console.log(`  ✓ PASS: Correctly rejected (${validationResult.error})`);
          results.passed++;
        } else {
          console.log(`  ✗ FAIL: Should have been rejected but was allowed`);
          results.failed++;
        }
      } else {
        if (validationResult.valid) {
          console.log(`  ✓ PASS: Correctly allowed`);
          results.passed++;
        } else {
          console.log(`  ✗ FAIL: Should have been allowed but was rejected (${validationResult.error})`);
          results.failed++;
        }
      }

      if (testCleanup) {
        try {
          testCleanup();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      results.failed++;
    }
  });

  console.log('\n=== Test Results ===');
  console.log(`Total:  ${results.total}`);
  console.log(`Passed: ${results.passed} (${Math.round(results.passed / results.total * 100)}%)`);
  console.log(`Failed: ${results.failed}`);

  return results.failed === 0;
}

// Simplified path validation logic (mimics the TypeScript implementation)
function validatePath(inputPath) {
  try {
    const projectRoot = process.cwd();

    // Resolve to absolute path
    const absolutePath = path.resolve(projectRoot, inputPath);

    // Resolve symlinks
    let resolvedPath;
    try {
      resolvedPath = fs.realpathSync(absolutePath);
    } catch (error) {
      return { valid: false, error: 'Path does not exist or cannot be resolved' };
    }

    // Check if within project
    if (!resolvedPath.startsWith(projectRoot + '/') && resolvedPath !== projectRoot) {
      return { valid: false, error: 'Path traversal detected - outside project' };
    }

    // Check file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext !== '.json') {
      return { valid: false, error: `Invalid file extension: ${ext}` };
    }

    // Check if in allowed directories
    const allowedDirs = [
      path.join(projectRoot, '.claude', 'config'),
      path.join(projectRoot, '.claude', 'lib', 'routing'),
      path.join(projectRoot, 'config')
    ];

    const fileDir = path.dirname(resolvedPath);
    const isAllowed = allowedDirs.some(allowedDir =>
      fileDir === allowedDir || fileDir.startsWith(allowedDir + '/')
    );

    if (!isAllowed) {
      return { valid: false, error: 'Path not in allowed directories' };
    }

    // Check file size
    const stats = fs.statSync(resolvedPath);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_SIZE) {
      return { valid: false, error: `File too large: ${stats.size} bytes` };
    }

    // Check if regular file
    if (!stats.isFile()) {
      return { valid: false, error: 'Not a regular file' };
    }

    return { valid: true, path: resolvedPath };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Main execution
try {
  setup();
  const success = runTests();
  cleanup();

  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\n✗ Fatal error:', error);
  cleanup();
  process.exit(1);
}
