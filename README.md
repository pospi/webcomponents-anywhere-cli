# Universal component compiler for Svelte components

This is an attempt to implement a framework-agnostic component authoring system by way of a build toolchain that compiles Svelte templates into components that natively work with a range of popular frontend libraries.

**WIP!** functionality incomplete.

## Behaviour

The CLI performs the following operations:

- Loads compiler options from the `svelte.config.js` file in the current working directory.
- Determines the source directory to search for source Svelte components.
- Determines the destination base directory for placing the output files.
- Loads [EJS templates](https://www.npmjs.com/package/ejs) for the output components from the `template-*` directories in this module.
- Recursively checks for `package.json` files under the source folder, without recursing into `node_modules` directories.
	- If the `main` field does not point to a `*.svelte` file, the package is skipped.

For each Svelte component package found:

- The contents of its `package.json` file are loaded into a `pkg` template variable.
- A WebComponent is generated:
	- A `customElement` build is run and the generated component is output (along with its dependencies) to the destination base folder, under a `wc` subdirectory.
	- The `template-wc` EJS template files are processed against `pkg` and output to the same directory.
- A [Sapper](https://sapper.svelte.dev/)-compatible component module is generated:
	- An `ssr` build is run and the generated component is output to the destination base folder, under an `ssr` subdirectory.
	- The `template-ssr` EJS template files are processed against `pkg` and output to the same directory.
- The `package.json` metadata for the generated WebComponent is loaded and made available via the `componentPkg` template variable.
- Every remaining EJS templates are then processed in turn:
	- The "component type" of the template (the path suffix as in `template-`**`${templateId}`**) is provided via the `componentType` template variable.
	- The EJS template files for the component type are processed against `pkg`, `componentPkg` & `componentType`; and output to the destination base folder, under a `componentType` subdirectory.

Upon completion, you will end up with a set of nodejs packages that are wrapped to be natively compatible with various runtimes. Note that the templates are wired up such that the runtime-specific packages depend on the `*-wc` package, so when publishing these you will need to publish the webcomponents prior to the runtime-specific wrappers.

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
