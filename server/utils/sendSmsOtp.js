const axios = require("axios");

const sendSmsOtp = async ({ phone, otp }) => {
  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      {
        template_id: process.env.MSG91_OTP_TEMPLATE_ID,
        short_url: "0",
        recipients: [
          {
            mobiles: phone,
            OTP: otp,
          },
        ],
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("MSG91 OTP sent successfully:", response.data);

    return response.data;
  } catch (error) {
    console.error(
      "MSG91 error:",
      error.response?.data || error.message
    );

    throw new Error("Unable to send SMS OTP");
  }
};

module.exports = sendSmsOtp;