#!/usr/bin/env node
// A standalone MCP server for notugly's checks — `check_contrast`,
// `fix_contrast`, `name_colour` — talking the MCP stdio wire protocol
// (newline-delimited JSON-RPC 2.0) directly, rather than pulling in the SDK.
//
// The README already says a *sibling* project's MCP server exposes
// `check_contrast` by importing this library. This is that tool, living in
// this repo, reachable on its own — and the protocol itself is small enough
// (three request types this server actually needs to answer) that a
// dependency for it would be the one place "zero dependencies" stopped being
// true for this project's own tooling. Same reasoning as `lib/raster.mjs`.
//
// Run it directly, or point an MCP client at:
//   node mcp/server.mjs

import { createInterface } from 'node:readline';
import { contrast, rate, AA_TEXT, AA_LARGE, AAA_TEXT } from '../lib/color.mjs';
import { fixContrast } from '../lib/fix.mjs';
import { name as nameColour } from '../lib/names.mjs';
import { apca } from '../lib/apca.mjs';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'notugly', version: '0.3.0' };

export const TOOLS = [
  {
    name: 'check_contrast',
    description: 'WCAG 2.1 and APCA contrast between two colours. Computes the actual ratio — never estimates one.',
    inputSchema: {
      type: 'object',
      properties: {
        foreground: { type: 'string', description: 'Hex colour, e.g. "#1a1a1a"' },
        background: { type: 'string', description: 'Hex colour, e.g. "#ffffff"' },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'fix_contrast',
    description: 'The nearest colour to the one given that clears a contrast target — same hue and chroma, just readable.',
    inputSchema: {
      type: 'object',
      properties: {
        foreground: { type: 'string', description: 'Hex colour to adjust' },
        background: { type: 'string', description: 'Hex colour it sits on' },
        target: { type: 'string', enum: ['aa-large', 'aa', 'aaa'], description: 'Defaults to "aa" (4.5:1).' },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'name_colour',
    description: 'The nearest human colour name for a hex value — "Hydrangea", not "#4f76b6". Nobody argues over a name.',
    inputSchema: {
      type: 'object',
      properties: { hex: { type: 'string', description: 'Hex colour, e.g. "#4f76b6"' } },
      required: ['hex'],
    },
  },
];

const TARGETS = { 'aa-large': AA_LARGE, aa: AA_TEXT, aaa: AAA_TEXT };

const textResult = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });
const errorResult = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

/** The part of this file that has nothing to do with MCP — plain functions
 * over this project's own colour library, exported so it can be tested
 * without spinning up a subprocess and talking JSON-RPC to it. */
export function callTool(toolName, args = {}) {
  try {
    switch (toolName) {
      case 'check_contrast': {
        const ratio = +contrast(args.foreground, args.background).toFixed(2);
        return textResult({
          foreground: args.foreground,
          background: args.background,
          ratio,
          wcagGrade: rate(ratio),
          apca: apca(args.foreground, args.background),
          passesAALarge: ratio >= AA_LARGE,
          passesAA: ratio >= AA_TEXT,
          passesAAA: ratio >= AAA_TEXT,
        });
      }
      case 'fix_contrast': {
        const target = TARGETS[args.target] ?? AA_TEXT;
        return textResult(fixContrast(args.foreground, args.background, { target }));
      }
      case 'name_colour':
        return textResult(nameColour(args.hex));
      default:
        return errorResult(`Unknown tool "${toolName}". Available: ${TOOLS.map((t) => t.name).join(', ')}.`);
    }
  } catch (e) {
    return errorResult(e.message);
  }
}

// --- the wire protocol --------------------------------------------------------
// MCP over stdio: one JSON-RPC 2.0 message per line, in and out. Only run
// this part when the file is executed directly, so `callTool`/`TOOLS` stay
// importable for tests without opening a readline loop on process.stdin.

function serve() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
  const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
  const replyError = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return; // not valid JSON-RPC; no id to reply to, nothing sensible to send back
    }

    const { id, method, params } = msg;
    switch (method) {
      case 'initialize':
        reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
        break;
      case 'notifications/initialized':
      case 'notifications/cancelled':
        break; // notifications get no response, by definition
      case 'ping':
        reply(id, {});
        break;
      case 'tools/list':
        reply(id, { tools: TOOLS });
        break;
      case 'tools/call':
        reply(id, callTool(params?.name, params?.arguments));
        break;
      default:
        if (id !== undefined) replyError(id, -32601, `Method not found: ${method}`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) serve();
