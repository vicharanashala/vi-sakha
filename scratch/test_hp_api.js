const axios = require('axios');

async function run() {
  const url = "https://script.google.com/macros/s/AKfycby4uj1yr4KhQdiZeWlm2zYX96ypW--IdtNhu7ZXwStCp8A-WK_vJMWYH2rhkzFAz3Cg/exec";
  try {
    console.log("Calling AKSians HP API...");
    const res = await axios.get(url, { timeout: 10000 });
    console.log("Response status:", res.status);
    console.log("Response data keys:", Object.keys(res.data));
    console.log("Response structure sample:", JSON.stringify(res.data).substring(0, 1000));
  } catch (err) {
    console.error("Error occurred:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}
run();
