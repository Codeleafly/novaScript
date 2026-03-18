
import { RuntimeVal, MK_NATIVE_FN, MK_STRING, MK_BOOL, MK_NULL, MK_NUMBER, MK_OBJECT, FunctionVal } from "../values";
import { evaluate, ReturnException } from "../interpreter";
import Environment from "../environment";
import { execSync } from "child_process";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// A more robust, native HTTP implementation for v5.0.0
export function createHTTPModule() {
    const httpProps = new Map<string, RuntimeVal>();

    // Native Client
    const makeRequest = (method: string, urlStr: string, data?: string, headers: Record<string, string> = {}) => {
        const script = `
            const { request } = require('${urlStr.startsWith('https') ? 'https' : 'http'}');
            const data = ${data ? JSON.stringify(data) : 'null'};
            const options = {
                method: '${method.toUpperCase()}',
                headers: ${JSON.stringify(headers)}
            };
            const req = request('${urlStr}', options, (res) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    console.log(JSON.stringify({
                        data: body,
                        status: res.statusCode,
                        headers: res.headers
                    }));
                });
            });
            req.on('error', (e) => {
                console.log(JSON.stringify({ error: e.message }));
            });
            if (data) {
                req.write(data);
            }
            req.end();
        `;
        
        try {
            const tempFile = path.join(os.tmpdir(), `novascript-http-${Date.now()}.js`);
            fs.writeFileSync(tempFile, script);
            
            const nodeModulesPath = path.resolve(__dirname, '..', '..', '..', 'node_modules');
            const outputBuffer = execSync(`NODE_PATH=${nodeModulesPath} node ${tempFile}`);
            const output = outputBuffer ? outputBuffer.toString() : "";
            fs.unlinkSync(tempFile);
            
            if (!output) {
                console.log("HTTP Request Error: No output from helper script.");
                return MK_NULL();
            }

            const res = JSON.parse(output);

            if (res.error) {
                console.log("HTTP Request Error:", res.error);
                return MK_NULL();
            }

            const resProps = new Map<string, RuntimeVal>();
            resProps.set("data", MK_STRING(res.data));
            resProps.set("status", MK_NUMBER(res.status));
            // You could add headers here too if needed
            return MK_OBJECT(resProps);
        } catch (e: any) {
            console.log("Failed to execute HTTP request:", e.message);
            return MK_NULL();
        }
    };

    httpProps.set("get", MK_NATIVE_FN((args) => {
        const url = (args[0] as any).value;
        return makeRequest("GET", url);
    }));

    httpProps.set("post", MK_NATIVE_FN((args) => {
        const url = (args[0] as any).value;
        const data = (args[1] as any).value;
        const headers = { 'Content-Type': 'application/json' }; // Assume JSON for simplicity
        return makeRequest("POST", url, data, headers);
    }));

    // Native Server
    httpProps.set("createServer", MK_NATIVE_FN((args, env) => {
        const routes = new Map<string, Map<string, FunctionVal>>();

        const server = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url || "/", `http://${req.headers.host}`);
            const path = parsedUrl.pathname;
            const method = (req.method || "GET").toUpperCase();
            
            const pathRoutes = routes.get(path);
            const handler = pathRoutes ? pathRoutes.get(method) : undefined;

            if (!handler) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not Found");
                return;
            }

            let body = "";
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                const scope = new Environment(handler.declarationEnv);
                
                const reqProps = new Map<string, RuntimeVal>();
                reqProps.set("body", MK_STRING(body));
                // Add query/params later if needed
                const nsReq = MK_OBJECT(reqProps);
                
                const resProps = new Map<string, RuntimeVal>();
                resProps.set("send", MK_NATIVE_FN((args) => {
                    const data = (args[0] as any).value;
                    if (!res.headersSent) {
                        res.writeHead(200, { "Content-Type": "text/plain" });
                    }
                    res.end(data);
                    return MK_NULL();
                }));
                const nsRes = MK_OBJECT(resProps);

                if (handler.parameters.length >= 1) scope.declareVar(handler.parameters[0], nsReq, false);
                if (handler.parameters.length >= 2) scope.declareVar(handler.parameters[1], nsRes, false);

                try {
                    evaluate({ kind: "Program", body: handler.body } as any, scope);
                } catch (e) {
                    if (!(e instanceof ReturnException)) {
                        console.error("Error in NovaScript HTTP handler:", e);
                        res.writeHead(500);
                        res.end("Internal Server Error");
                    }
                }
            });
        });

        const serverObj = new Map<string, RuntimeVal>();
        const addRoute = (method: string) => MK_NATIVE_FN((args) => {
            const path = (args[0] as any).value;
            const handler = args[1] as FunctionVal;
            if (!routes.has(path)) routes.set(path, new Map());
            routes.get(path)!.set(method, handler);
            return MK_NULL();
        });

        serverObj.set("get", addRoute("GET"));
        serverObj.set("post", addRoute("POST"));

        serverObj.set("listen", MK_NATIVE_FN((args) => {
            const port = (args[0] as any).value;
            server.listen(port, () => {
                console.log(`NovaScript Native Server listening on port ${port}`);
            });
            // Keep process alive
            return MK_NULL();
        }));

        return MK_OBJECT(serverObj);
    }));

    return MK_OBJECT(httpProps);
}
