# Code Cover

This plugin will look for a coverageconfig.json recusively up from the active document. Once it is found it will resolve.

[Video](https://www.youtube.com/watch?v=umXk8o_7Dss)

# Getting Started

* Install and run [istanbul](https://www.npmjs.com/package/istanbul) - this will generate a `coverage/` directory.
* Click the **Getting Started** button on the
[marketplace](https://marketplace.visualstudio.com/items/bradleymeck.codecover) and follow the directions
* Search for `Code Cover` and install the extension
* Restart VS Code
* Place a `coverageconfig.json` file (see below) in the source directory next to your source.

# Configuration

## coverageconfig.json

```
{
	"coverage": ["../coverage/lcov.info"],
	"sourcemapped": ["../out/server/**.js"],
	"automaticallyShow": true,
	"ignore": ["*.json"]
}
```

It expects `coverage` to be an array of filepaths to LCOV files.

It allows `sourcemapped` to be an array of file patterns that may contain sourcemaps to the files in the directory where `coverageconfig.json` is placed.

It allows `automaticallyShow` to be a boolean indicating whether to highlight covered lines automatically or only on click

It allows `ignore` which is an array of file patterns of source files to ignore

Due to code coverage being applied to transformed files in JS, there is often a difference in the generated files that are executed and the original source files that a developer edits.

You can view the `example/server/` as the development files and the `example/out/server/` as the generated files while using the plugin.
