// src/runtime/library_manager.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import chalk from "chalk";

/**
 * LibraryManager handles the decentralized global import engine for NovaScript v6.0.0.
 * It manages a global cache in ~/.nova_libs/ and resolves remote modules from NPM, GitHub, and HTTPS.
 */
export class LibraryManager {
    static readonly BASE_DIR = path.join(os.homedir(), ".nova_libs");
    static readonly NPM_DIR = path.join(LibraryManager.BASE_DIR, "npm");
    static readonly GITHUB_DIR = path.join(LibraryManager.BASE_DIR, "github");
    static readonly HTTPS_DIR = path.join(LibraryManager.BASE_DIR, "https");

    /**
     * Ensures the global library directories exist.
     */
    static ensureDirs() {
        if (!fs.existsSync(this.BASE_DIR)) fs.mkdirSync(this.BASE_DIR, { recursive: true });
        if (!fs.existsSync(this.NPM_DIR)) fs.mkdirSync(this.NPM_DIR, { recursive: true });
        if (!fs.existsSync(this.GITHUB_DIR)) fs.mkdirSync(this.GITHUB_DIR, { recursive: true });
        if (!fs.existsSync(this.HTTPS_DIR)) fs.mkdirSync(this.HTTPS_DIR, { recursive: true });
    }

    /**
     * Resolves a module path based on its prefix.
     * @returns The absolute path to the main file of the resolved module or the raw code string.
     */
    static async resolve(modulePath: string): Promise<{ path: string, isNative: boolean }> {
        this.ensureDirs();

        if (modulePath.startsWith("npm:")) {
            return await this.resolveNpm(modulePath.slice(4));
        } else if (modulePath.startsWith("node:")) {
            return { path: modulePath, isNative: true };
        } else if (modulePath.startsWith("github:")) {
            return await this.resolveGithub(modulePath.slice(7));
        } else if (modulePath.startsWith("https://") || modulePath.startsWith("http://")) {
            return await this.resolveHttps(modulePath);
        }

        return { path: modulePath, isNative: false };
    }

    /**
     * Resolves an NPM package. If not cached, it downloads it globally.
     */
    private static async resolveNpm(pkg: string): Promise<{ path: string, isNative: boolean }> {
        // Handle versions: npm:axios@1.2.1 -> path-safe version
        // Fix for scoped packages: @username/pkg@version
        let name = pkg;
        const atIndex = pkg.indexOf("@", 1); // Ignore first character
        if (atIndex > 0) {
            name = pkg.slice(0, atIndex); // Extracts proper name even if scoped
        }
        const pkgPath = path.join(this.NPM_DIR, "node_modules", name);

        if (!fs.existsSync(pkgPath)) {
            console.log(chalk.blue(`📥 Downloading npm:${pkg}...`));
            try {
                // Ensure npm init has run in the npm dir if node_modules doesn't exist
                if (!fs.existsSync(path.join(this.NPM_DIR, "package.json"))) {
                    fs.writeFileSync(path.join(this.NPM_DIR, "package.json"), JSON.stringify({ name: "nova-libs-npm" }));
                }

                // We use --prefix to install into our global storage
                execSync(`npm install ${pkg} --prefix "${this.NPM_DIR}" --no-save --quiet`, { stdio: "inherit" });
                console.log(chalk.green(`✔ Cached npm:${pkg}`));
            } catch (e: any) {
                throw new Error(`Failed to download NPM package ${pkg}: ${e.message}`);
            }
        }

        // Set NODE_PATH so nested requires work
        const nodeModulesPath = path.join(this.NPM_DIR, "node_modules");
        if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(nodeModulesPath)) {
            process.env.NODE_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : "") + nodeModulesPath;
            // Force reload of NODE_PATH for Node's module loader
            require("module").Module._initPaths();
        }

        return { path: name, isNative: true };
    }

    /**
     * Resolves a GitHub repository using jsDelivr CDN and manifest support.
     */
    private static async resolveGithub(repoPath: string): Promise<{ path: string, isNative: boolean }> {
        // Format: user/repo[@version][/filepath]
        const match = repoPath.match(/^([^/@]+)\/([^/@]+)(?:@([^/]+))?(?:\/(.+))?$/);
        if (!match) throw new Error(`Invalid GitHub path: ${repoPath}. Expected user/repo[@version][/filepath]`);
        
        const user = match[1];
        const repo = match[2];
        const version = match[3] || "latest"; // Default branch
        let requestedFile = match[4];
        
        const targetDir = path.join(this.GITHUB_DIR, user, repo, version);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // 1. Try to resolve via manifest if no specific file requested
        if (!requestedFile) {
            const manifestPath = path.join(targetDir, "nova.json");
            try {
                if (!fs.existsSync(manifestPath)) {
                    console.log(chalk.blue(`🔍 Fetching manifest for github:${user}/${repo}...`));
                    const manifestUrl = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${version}/nova.json`;
                    const content = await this.download(manifestUrl);
                    fs.writeFileSync(manifestPath, content);
                }
                const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                requestedFile = manifest.main || "main.nv";
            } catch (e) {
                // Fallback if no nova.json found
                requestedFile = "main.nv";
            }
        }
        
        const mainFile = path.join(targetDir, requestedFile!);

        if (!fs.existsSync(mainFile)) {
            console.log(chalk.blue(`📥 Downloading github:${user}/${repo}/${requestedFile}...`));
            fs.mkdirSync(path.dirname(mainFile), { recursive: true });
            
            const cdnUrl = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${version}/${requestedFile}`;
            const content = await this.download(cdnUrl);
            fs.writeFileSync(mainFile, content);
            console.log(chalk.green(`✔ Cached github:${repoPath}`));
        }

        return { path: mainFile, isNative: false };
    }

    /**
     * Resolves a raw HTTPS URL.
     */
    private static async resolveHttps(url: string): Promise<{ path: string, isNative: boolean }> {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname) || "index.nv";
        const targetDir = path.join(this.HTTPS_DIR, urlObj.hostname, path.dirname(urlObj.pathname));
        const targetFile = path.join(targetDir, fileName);

        if (!fs.existsSync(targetFile)) {
            console.log(chalk.blue(`📥 Downloading ${url}...`));
            fs.mkdirSync(targetDir, { recursive: true });
            const content = await this.download(url);
            fs.writeFileSync(targetFile, content);
            console.log(chalk.green(`✔ Cached ${url}`));
        }

        return { path: targetFile, isNative: false };
    }

    private static async download(url: string): Promise<string> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to download ${url}: Status ${res.status}`);
        return await res.text();
    }

    /**
     * Cleans the global library cache.
     */
    static clean() {
        if (fs.existsSync(this.BASE_DIR)) {
            fs.rmSync(this.BASE_DIR, { recursive: true, force: true });
            console.log(chalk.green("✔ Global library cache cleared."));
        }
    }
}
