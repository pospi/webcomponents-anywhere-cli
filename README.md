# Universal component compiler for Svelte components

This is an attempt to implement a framework-agnostic component authoring system by way of a build toolchain that compiles Svelte templates into components that natively work with a range of popular frontend libraries.

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
