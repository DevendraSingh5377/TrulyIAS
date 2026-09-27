const axios = require("axios");

const sendSmsOtp = async ({ phone, otp }) => {
  try {
    // Format phone: strip non-digits, remove leading 0, ensure 91 prefix for 10-digit Indian numbers
    let cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.slice(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    console.log(`[MSG91] Sending OTP ${otp} to mobile: ${cleanPhone}`);

    // Call MSG91 dedicated OTP API
    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp",
      {
        otp: String(otp),
        OTP: String(otp),
      },
      {
        params: {
          template_id: process.env.MSG91_OTP_TEMPLATE_ID,
          mobile: cleanPhone,
          otp: String(otp),
          authkey: process.env.MSG91_AUTH_KEY,
        },
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(`[MSG91] Response for ${cleanPhone}:`, response.data);

    if (response.data && response.data.type === "error") {
      console.error("[MSG91 Error Response]:", response.data);
      throw new Error(response.data.message || "MSG91 rejected OTP request");
    }

    return response.data;
  } catch (error) {
    console.error(
      "[MSG91 Delivery Error]:",
      error.response?.data || error.message
    );
    throw new Error("Unable to send SMS OTP");
  }
};

module.exports = sendSmsOtp;