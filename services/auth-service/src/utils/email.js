import { BrevoClient } from "@getbrevo/brevo";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let brevoClient = null;
const getBrevoClient = () => {
  if (!brevoClient) {
    brevoClient = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY,
    });
  }
  return brevoClient;
};

export async function sendOtpEmail(options) {
  const templatePath = path.join(__dirname, "..", "views", "emails", "otp.ejs");

  const data = {
    appName: "Socially",
    userName: options.user.username,
    otp: options.otp,
    purpose: options.purpose || "verify your email",
    expiryMinutes: 10,
    supportEmail: "divyeshodedara1012@gmail.com",
    year: new Date().getFullYear(),
  };

  const html = await ejs.renderFile(templatePath, data);
  const client = getBrevoClient();

  await client.transactionalEmails.sendTransacEmail({
    sender: { name: "Socially", email: "divyeshodedara1012@gmail.com" },
    to: [{ email: options.user.email }],
    subject: `Your OTP for ${data.appName}`,
    htmlContent: html,
  });
}

export default sendOtpEmail;
