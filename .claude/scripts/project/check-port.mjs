#!/usr/bin/env node
import { Socket } from "node:net";

// Cross-platform replacement for `lsof -i :<port> -sTCP:LISTEN -n -P`, which does not
// exist on Windows. Always exits 0 so callers read the token instead of an exit code.

const DEFAULT_PORT = 5173;
const CONNECT_TIMEOUT_MS = 500;

function probe(host, port) {
  return new Promise((resolve) => {
    const socket = new Socket();
    const finish = (listening) => {
      socket.destroy();
      resolve(listening);
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect({ host, port });
  });
}

async function main() {
  const arg = process.argv.slice(2).find((value) => !value.startsWith("--"));
  const port = Number(arg ?? DEFAULT_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port "${arg}". Usage: node check-port.mjs [port]`);
  }

  // Vite may bind IPv4 or IPv6 localhost depending on the host resolution.
  for (const host of ["127.0.0.1", "::1"]) {
    if (await probe(host, port)) {
      console.log(`IN_USE ${host}:${port}`);
      console.log(`Something is already listening on port ${port}; reuse the existing viewer.`);
      return;
    }
  }

  console.log(`FREE ${port}`);
  console.log(`Port ${port} is free; start the asset viewer.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
