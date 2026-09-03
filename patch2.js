const fs = require("fs");

const file = "apps/api/src/routes/resources.ts";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  `        request.log.error(err, "Resource creation failed");
        return reply.status(500).send({ error: "Internal server error" } as any);`,
  `        request.log.error(err, "Resource creation failed");
        return reply.status(500).send({ error: err.message || err.toString() } as any);`,
);

fs.writeFileSync(file, code);
