const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Raíz del monorepo (dos niveles arriba de apps/mobile)
const monorepoRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Necesario para que Metro resuelva los paquetes del monorepo (packages/types, packages/core)
config.watchFolders = [monorepoRoot];

// Buscar node_modules primero en el proyecto y luego en la raíz del monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
