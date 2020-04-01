import * as path from 'path';
import * as vscode from 'vscode';

import { FileSystem, Watchers } from '../utils';

interface TslintJsonSchema {
    rules?: {
        'component-class-suffix'?: boolean | [true, ...string[]];
    };
}

export class TslintConfig {

    /** Basename of TSLint config file */
    private static readonly fileName = 'tslint.json';
    /** Values from TSLint config file */
    private config: TslintJsonSchema | undefined;
    /** List of components suffixes defined in `tslint.json` */
    private componentSuffixes: string[] = [];
    private watcher: vscode.FileSystemWatcher | undefined;

    constructor(private workspace: vscode.WorkspaceFolder) {}

    /**
     * Initializes `tslint.json` configuration.
     * **Must** be called after each `new TslintConfig()`
     * (delegated because `async` is not possible on a constructor).
     */
    async init(): Promise<void> {

        const fsPath = path.join(this.workspace.uri.fsPath, TslintConfig.fileName);

        this.config = await FileSystem.parseJsonFile<TslintJsonSchema>(fsPath, this.workspace);

        this.setComponentSuffixes();

        /* Watcher must be set just once */
        if (this.config && !this.watcher) {

            this.watcher = Watchers.watchFile(fsPath, () => {
                this.init();
            });

        }

    }

    /**
     * Get component suffixes defined in `tslint.json`, or at least `Component` by default.
     */
    getComponentSuffixes(): string[] {
        return this.componentSuffixes;
    }

    /**
     * Tells if a suffix has been defined by the user in `tslint.json`
     */
    hasSuffix(suffix: string): boolean {

        /* Lowercase both values to be sure to match all styles */
        return this.componentSuffixes.map((suffix) => suffix.toLowerCase()).includes(suffix.toLowerCase());

    }

    /**
     * Set component suffixes defined in `tslint.json`, or at least `Component` by default.
     */
    private setComponentSuffixes(): void {

        /* `Component` is always authorized as it's the default in Angular CLI */
        const suffixes = ['Component'];

        /* 
         * Can be:
         * 1. nonexistent
         * 2. `true` (default Angular CLI config)
         * 3. `[true, "Component", "Dialog"]` (user defined)
         */
        const tslintRule = this.config?.rules?.['component-class-suffix'];

        /* Check we are in the 3rd case */
        if (Array.isArray(tslintRule) && tslintRule.length > 2) {

            /* Removes the first value (`true`)
             * Type cast is required as TypeScript cannot do it itself in this case */
            const tslintSuffixes = tslintRule.slice(1) as string[];

            suffixes.push(...tslintSuffixes);

        }

        /* `Set` removes duplicates */
        this.componentSuffixes = Array.from(new Set(suffixes));

    }

}