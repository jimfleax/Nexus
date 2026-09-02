const fs = require("fs");
const path = "apps/api/src/routes/auth.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  "function sessionCookie(jwt: string): string {",
  `const cookieOptions = () => \`HttpOnly; \${frontendUrl().startsWith("https://") ? "Secure; " : ""}SameSite=Lax; Path=/\`;

/** Emit the nexus-session Set-Cookie header */
function sessionCookie(jwt: string): string {`,
);

code = code.replace(
  /HttpOnly; Secure; SameSite=Lax; Path=\//g,
  "${cookieOptions()}",
);

fs.writeFileSync(path, code);
