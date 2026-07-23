export default {
  "*.{ts,js}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": "prettier --write",
  // Any change to the manifest or lockfile must still reproduce via a clean
  // install. The function form runs the command with no file arguments appended.
  "{package.json,package-lock.json}": () => "npm ci --dry-run",
};
