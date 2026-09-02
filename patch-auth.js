const fs = require("fs");
let code = fs.readFileSync("apps/api/src/auth.ts", "utf-8");

code = code.replace(
  "const { payload } = await jwtVerify(token, key);",
  "const { payload } = await jwtVerify(token, key, { clockTolerance: 30 });",
);

fs.writeFileSync("apps/api/src/auth.ts", code);
