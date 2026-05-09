#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { Keypair } = require('@solana/web3.js');

function parseArgs(argv) {
	const args = {
		out: null,
		force: false,
	};

	for (let index = 2; index < argv.length; index += 1) {
		const current = argv[index];

		if (current === '--out') {
			const next = argv[index + 1];
			if (!next || next.startsWith('--')) {
				throw new Error('Missing value for --out');
			}
			args.out = next;
			index += 1;
			continue;
		}

		if (current === '--force') {
			args.force = true;
			continue;
		}

		if (current === '--help' || current === '-h') {
			return { ...args, help: true };
		}

		throw new Error(`Unknown argument: ${current}`);
	}

	return args;
}

function printHelp() {
	// Keep help short: this is a submission utility.
	console.log('Usage: node scripts/generate-program-id.js [--out <path>] [--force]');
	console.log('');
	console.log('Generates a new Solana keypair and prints its public key (Program ID).');
	console.log('');
	console.log('Options:');
	console.log('  --out <path>   Write the secret key (JSON array) to a file');
	console.log('  --force        Overwrite the output file if it exists');
}

function ensureParentDir(filePath) {
	const parent = path.dirname(filePath);
	fs.mkdirSync(parent, { recursive: true });
}

function main() {
	const args = parseArgs(process.argv);

	if (args.help) {
		printHelp();
		process.exit(0);
	}

	const keypair = Keypair.generate();
	const programId = keypair.publicKey.toBase58();

	console.log(programId);

	if (!args.out) {
		return;
	}

	const resolvedOut = path.resolve(process.cwd(), args.out);

	if (fs.existsSync(resolvedOut) && !args.force) {
		throw new Error(`Refusing to overwrite existing file: ${resolvedOut} (use --force)`);
	}

	ensureParentDir(resolvedOut);
	fs.writeFileSync(resolvedOut, JSON.stringify(Array.from(keypair.secretKey)), { encoding: 'utf8' });

	// Print the path to stderr to avoid messing up copy/paste of the program id.
	process.stderr.write(`Saved keypair: ${resolvedOut}\n`);
}

main();
