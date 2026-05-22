import { randomBytes } from "crypto";

/**
 * @desc    Generate a secure random string for JWT_SECRET
 */
const secret = randomBytes(64).toString("hex");

console.log("--- Generated JWT Secret Key ---");
console.log(secret);
console.log("--------------------------------");
console.log("Copy the key above and paste it into your .env file as JWT_SECRET");
