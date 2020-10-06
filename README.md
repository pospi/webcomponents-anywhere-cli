# WebComponents Anywhere command-line compiler

This is an attempt to implement a framework-agnostic component authoring system by way of a build toolchain that compiles vanilla WebComponents and Svelte templates into modules which natively work with a range of popular frontend libraries.

**WIP!** functionality incomplete.

<!-- MarkdownTOC -->

- [Authoring compatible modules](#authoring-compatible-modules)
- [Behaviour](#behaviour)
- [Feature goals](#feature-goals)
- [License](#license)

<!-- /MarkdownTOC -->

## Authoring compatible modules

For your UI components to be recognised and correctly processed by this tool, please ensure that there is a `package.json` file in each module folder that you wish to be processed. The `main` field of each package file should reference either a JavaScript module containing a raw WebComponent (authored using any JS framework of your choice); or a raw Svelte component ready to be processed by the Svelte compiler.

Since the goal of this tool is to reduce integration complexity, there are a few other aspects you should be aware of if you use a more advanced build setup:

- WebComponent modules are copied as-is. Svelte modules are compiled to WebComponents, *but dependencies are not*. This means that:
	- Neither module type is bundled upon compiling. The intention is to make components ready to drop in to a commonjs-compatible project&mdash; it is expected that the integrating project will perform any bundling as part of its own publish workflow.
	- Any additional bundler configuration for non-native source file types (eg. TypeScript) must be replicated by consumers of your compiled WebComponent modules *as well as* consumers of the Svelte version. This increases integration complexity.

**For these reasons, we recommend that you run any pre-compile steps needed to generate pure-JS versions of your component dependencies *before* running this build script**, and reference the `*.js` version of all related modules from your component files rather than other source file formats.

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
		- All files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are copied to `COMPONENT_OUTPUT_DIR`.
		- Nothing else happens to the package. **It is presumed to export a `HTMLElement` class definition as its default export.**
	- If the `main` field points to a `*.svelte` file, the package is assumed to be a [Svelte](https://svelte.dev) component authored using the Svelte syntax.
		- All files [referenced in the package](https://docs.npmjs.com/files/package.json#files) are copied to `COMPONENT_OUTPUT_DIR`.
		- A Web Component is compiled from the `main` source file, and it (along with its dependencies) is written to `COMPONENT_OUTPUT_DIR`.
		- A [Sapper](https://sapper.svelte.dev/)-compatible component module is also compiled- an `ssr` build is run by the Svelte compiler and the output (along with all dependencies) is written to `COMPONENT_OUTPUT_DIR/ssr`. The filename is the same as that generated for the Web Component version.
		- **The component is now importable in three flavours:** as a Svelte module, as a standards-compliant WebComponent, and as a Sapper SSR rendering object.
	- **Otherwise, the package is skipped.**
- Secondly, templates for each of the target component output types are executed to provide wrappers for various web application frameworks:
	- The contents of the component's `package.json` file is loaded into a `pkg` template variable.
	- The `template-wc` EJS template files are processed against `pkg` and output to `COMPONENT_OUTPUT_DIR`, overwriting any existing files.
	- The `package.json` metadata for the resulting generated WebComponent in `COMPONENT_OUTPUT_DIR` is loaded and made available via the `componentPkg` template variable.
	- If the original package was a Svelte module, the `template-ssr` EJS template files are processed against `pkg` and output to `COMPONENT_OUTPUT_DIR/ssr`, overwriting any existing files.
	- Every remaining EJS template is then processed in turn:
		- The "component type" of the template (the path suffix as in `template-`**`${templateId}`**) is provided via the `componentType` template variable. This will be a string like `'angular'`, `'react'`, `'vue'` etc.
		- The EJS template files for the component type are processed against `pkg`, `componentPkg` & `componentType`; and output to the destination base folder under a `componentType` subdirectory.

Upon completion, you will end up with a set of nodejs packages that are wrapped to be natively compatible with various runtimes.

**Pre-build clean steps and publish workflows are currently left as an exercise to the reader.**

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
