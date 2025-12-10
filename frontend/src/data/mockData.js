/**
 * Legacy Mock Data Export
 * This file maintains backward compatibility by re-exporting from the modular data structure
 * All actual data is now organized in separate files:
 * - constants.js: Static constants and categories
 * - users.js: User and notification data
 * - generators.js: Data generation functions
 * - index.js: Central export point (recommended)
 */

export * from './index.js';