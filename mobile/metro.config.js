// Web uygulamasının src/lib altındaki ortak kodu (çizelgeleme, tipler,
// Supabase sorguları) mobilde de kullanılır. Metro proje kökü dışındaki
// dosyaları ancak watchFolders'a eklenirse izler ve paketler.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../src/lib");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];

// Ortak koddaki paket importları yalnızca tip importu olmalı (`import type`).
// Çalışma zamanında paket import ederse Metro onu web'in node_modules'undan
// çözer ve pakete React/Supabase'in ikinci bir kopyası girer.

module.exports = config;
