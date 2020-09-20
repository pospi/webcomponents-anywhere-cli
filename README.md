# Universal WebComponent compiler

This is an attempt to implement a framework-agnostic component authoring system by way of a build toolchain that compiles vanilla WebComponents and Svelte templates into modules which natively work with a range of popular frontend libraries.

**WIP!** functionality incomplete.

## Behaviour

The CLI performs the following operations:

- Determines the `SOURCE_DIRECTORY` to search for source Web Components.
- Determines the `DEST_DIRECTORY` for placing the output files.
- Loads Svelte compiler options from the `svelte.config.js` file in the current working directory, if present.
- Loads [EJS templates](https://www.npmjs.com/package/ejs) for the output components from the `template-*` directories in *this* module.
- Recursively checks for `package.json` files under the `SOURCE_DIRECTORY`, without recursing into `node_modules` directories.
- For each package found, a `COMPONENT_OUTPUT_DIR` is determined by mapping the package file's path relative to the `DEST_DIRECTORY`.
- First, build artifacts are written into subdirectories of `COMPONENT_OUTPUT_DIR` according to the type of package detected:
	- If the `main` field in `package.json` is omitted or points to a `*.js` or `*.mjs` file, the package is assumed to be a ready-to-deploy standards compliant Web Component. <!-- You should set up any other build processes (eg. TypeScript) separately to the use of this module, and simply have them generate the final `main` scripts. -->
		- All files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are copied to `COMPONENT_OUTPUT_DIR/wc`.
	- If the `main` field points to a `*.svelte` file, the package is assumed to be a [Svelte](https://svelte.dev) component authored using the Svelte syntax.
		- All files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are copied to `COMPONENT_OUTPUT_DIR/svelte`.
		- A Web Component is compiled from the input, and it (along with its dependencies) is written to `COMPONENT_OUTPUT_DIR/wc`. Files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are *also* copied, excluding all `*.svelte` source files.
		- A [Sapper](https://sapper.svelte.dev/)-compatible component module is also compiled- an `ssr` build is run by the Svelte compiler and the output (along with all dependencies) is written to `COMPONENT_OUTPUT_DIR/ssr`. Files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are *also* copied, excluding all `*.svelte` source files.
	- **Otherwise, the package is skipped.**
- Secondly, templates for each of the target component output types are executed to provide wrappers for various web application frameworks:
	- The contents of the component's `package.json` file are loaded into a `pkg` template variable.
		- If `pkg.main` points to a `*.svelte` file, EJS templates are processed against the module in order to allow deriving target-specific package manifests from the original:
			- The `template-wc` EJS template files are processed against `pkg` and output to `COMPONENT_OUTPUT_DIR/wc`, overwriting any existing files.
			- The `template-ssr` EJS template files are processed against `pkg` and output to `COMPONENT_OUTPUT_DIR/ssr`, overwriting any existing files.
	- The `package.json` metadata for the resulting generated WebComponent in `COMPONENT_OUTPUT_DIR/wc` is loaded and made available via the `componentPkg` template variable. Note that if the component is a standard Web Component, this will be equivalent to the contents of `pkg`.
	- Every remaining EJS template is then processed in turn:
		- The "component type" of the template (the path suffix as in `template-`**`${templateId}`**) is provided via the `componentType` template variable. This will be a string like `'angular'`, `'react'`, `'vue'` etc.
		- The EJS template files for the component type are processed against `pkg`, `componentPkg` & `componentType`; and output to the destination base folder under a `componentType` subdirectory.

Upon completion, you will end up with a set of nodejs packages that are wrapped to be natively compatible with various runtimes. Note that the templates are wired up such that the runtime-specific packages depend on the `*/wc` package, so when publishing these you will need to publish the webcomponents prior to the runtime-specific wrappers.

Publish workflows are currently left as an exercise to the reader.

## Feature goals

- Allow the generation of separate NPM packages for the same component in runtime-dependant flavours (`mycomponentlib`, `mycomponentlib-react`, `mycomponentlib-angular` etc)
- Compile to zero-config components written in the native component format of the framework (eg. `ReactComponent`) without additional runtime or compile-time dependencies
    - probably adapted via small adapter modules eg. [webcomponents-in-react](https://www.npmjs.com/package/webcomponents-in-react)
    - all component dependencies should be managed via standard NPM dependencies so that installation is trivial
- Pluggable styles that work "natively" (at the framework's module resolution layer)
- File separation between component DOM logic and styles, to promote re-styling (see [svelte#4124](https://github.com/sveltejs/svelte/issues/4124))
- A default export of the component which mixes in a theme that is loaded from another file on top of the "unstyled" component; yielding the option to inject a custom theme if desired

Such a development pipeline is most useful for those wishing to author UI component kits that can be easily dropped in to other projects. For those wishing only to build Svelte components, or to simply integrate Svelte components into their existing app built with another framework, this is not what you're looking for.

For more information on what sparked this effort, see [svelte#4117](https://github.com/sveltejs/svelte/issues/4117).

## License

Apache 2.0
