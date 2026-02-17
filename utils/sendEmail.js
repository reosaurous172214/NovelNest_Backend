import Brevo from "@getbrevo/brevo";

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendEmail = async (options) => {
  try {
    const response = await apiInstance.sendTransacEmail({
      sender: {
        email: "novelnest1369@gmail.com",
        name: "NovelNest",
      },
      to: [{ email: options.email }],
      subject: options.subject,
      htmlContent: options.html,
    });

    return response;
  } catch (error) {
    console.error("Brevo Email Error:", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

export default sendEmail;
