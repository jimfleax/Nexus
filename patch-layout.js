const fs = require("fs");
let code = fs.readFileSync("apps/web/app/(dashboard)/layout.tsx", "utf-8");

code = code.replace(
  "const { payload } = await jwtVerify(token, key);",
  "const { payload } = await jwtVerify(token, key, { clockTolerance: 30 }); // Allow 30s clock skew",
);

code = code.replace(
  "} catch {",
  `} catch (err) {
    console.error("JWT Verification failed in layout.tsx:", err);`,
);

fs.writeFileSync("apps/web/app/(dashboard)/layout.tsx", code);
