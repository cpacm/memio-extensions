// rollup.config.mjs
import path from 'path';
import fs from 'fs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

var site = "app";
const dirs = fs.readdirSync(site);
var files = [];
dirs.forEach(dir => {
	if (fs.statSync(path.join(site, dir)).isDirectory()) {
		const filesList = fs.readdirSync(path.join(site, dir));
		filesList.forEach(file => {
			if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
				var filePath = path.join(dir, file);
				// if (filePath.startsWith("video")) {
				// 	files.push(filePath);
				// }
				files.push(filePath);
			}
		});
	}
});


// close this, Output all file.
files = ["article/world8.ts"];

// Output site js.
files.forEach(file => {
	console.log(file);
});

const rollupConfigs = files.map(file => {
	return {
		input: path.join(site, file),
		output: {
			file: path.join('dist', file.replace('.ts', '.js')),
			format: 'iife' //umd
		},
		onwarn: (warning, next) => {
			if (warning.code === 'EVAL') return;
			next(warning);
		},
		plugins: [
			typescript(),
			commonjs(),
			resolve({ browser: true, preferBuiltins: false }),
			// terser({
			// 	format: { comments: false },
			// 	compress: {
			// 		passes: 2,
			// 		unsafe: true,
			// 		unsafe_comps: true,
			// 		unsafe_proto: true,
			// 		unsafe_undefined: true
			// 	}
			// }),
		]
	}
});

export default rollupConfigs;