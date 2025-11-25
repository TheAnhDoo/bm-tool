const fs = require("fs");

function parseProfile(text) {
  const username = text.match(/Username:\s*(.+)/i)?.[1]?.trim() || "";
  const password = text.match(/Password:\s*(.+)/i)?.[1]?.trim() || "";
  const fa = text.match(/2FA Key:\s*(.+)/i)?.[1]?.trim() || "";
  const proxy = text.match(/Proxy:\s*(.+)/i)?.[1]?.trim() || "";

  return `${username}|${password}|${fa}|${proxy}`;
}

// Example usage:
const raw = fs.readFileSync("input.txt","utf8");

const profiles = raw
  .split(/-{3,}/g)      // split by --- lines
  .map(block => block.trim())
  .filter(block => block.length > 0)
  .map(parseProfile);

console.log(profiles.join("\n"));
