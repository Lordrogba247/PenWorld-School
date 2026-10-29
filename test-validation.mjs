import("./src/utils/bulkValidation.js")
  .then((m) => {
    console.log("STUDENT_SCHEMA keys:", Object.keys(m.STUDENT_SCHEMA.shape).join(", "));
    console.log("STAFF_SCHEMA keys:", Object.keys(m.STAFF_SCHEMA.shape).join(", "));
    console.log("ROLE_OPTIONS:", JSON.stringify(m.ROLE_OPTIONS));
    console.log("CLASS_OPTIONS:", JSON.stringify(m.CLASS_OPTIONS));
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
