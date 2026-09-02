const fs = require("fs");
const path = "apps/api/tests/auth-routes.test.ts";
let code = fs.readFileSync(path, "utf8");

code = code.replace(
  /expect\(res.statusCode\)\.toBe\(302\);\s+expect\(res\.headers\.location\)\.toBe\("http:\/\/localhost:3000\/projects"\);/g,
  `expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('<meta http-equiv="refresh" content="0;url=http://localhost:3000/projects">');`,
);

fs.writeFileSync(path, code);
