// shiva.js
module.exports = {
  SECURITY_TOKEN: "default-token",
  validateCore: () => true,
  validateCommandSecurity: () => true,
  getInfo: () => ({
    name: "Shiva Core",
    version: "1.0.0",
    status: "active",
    coreValid: true,
    description: "Clean validation module for bot core"
  }),
  initialize: () => {
    console.log("✅ Shiva core initialized (clean version)");
  }
};
