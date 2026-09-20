const axios = require("axios");
require("dotenv").config();

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoFromEmail =
  process.env.BREVO_FROM_EMAIL || "v1nnnpr0ject11@gmail.com";
const brevoFromName = process.env.BREVO_FROM_NAME || "Admin";

const sendEmail = async ({ to, name, subject, html, text }) => {
  console.log(
    `[EmailService] Attempting to send email to: ${to}, subject: ${subject}`,
  );

  if (
    !brevoApiKey ||
    (brevoApiKey.startsWith("xkeysib-") && brevoApiKey.length < 20)
  ) {
    console.warn(
      "[EmailService] Brevo API Key not configured or invalid. Skipping live email sending.",
    );
    return { success: false, message: "Email service not configured" };
  }

  try {
    const payload = {
      sender: {
        name: brevoFromName,
        email: brevoFromEmail,
      },
      to: [
        {
          email: to,
          name: name || "User",
        },
      ],
      htmlContent: html,
      textContent: text,
      subject: subject,
    };

    const config = {
      method: "post",
      url: "https://api.brevo.com/v3/smtp/email",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": brevoApiKey,
      },
      data: payload,
      timeout: 5000,
    };

    const response = await axios(config);
    console.log("[EmailService] Email sent successfully:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("[EmailService] Error sending email via Brevo:", errorMsg);
    return { success: false, error: errorMsg };
  }
};

module.exports = { sendEmail };
