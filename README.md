# Code Cover

This plugin will look for a coverageconfig.json recusively up from the active document. Once it is found it will resolve.

## coverageconfig.json

```
{
	"coverage": ["../coverage/lcov.info"],
	"sourcemapped": ["../out/server/**.js"]
}
```

It expects `coverage` to be an array of filepaths to LCOV files.

It allows `sourcemapped` to be an array of file patterns that may contain sourcemaps to the files in the directory where `coverageconfig.json` is placed.

Due to code coverage being applied to transformed files in JS, there is often a difference in the generated files that are executed and the original source files that a developer edits.

You can view the `example/server/` as the development files and the `example/out/server/` as the generated files while using the plugin.