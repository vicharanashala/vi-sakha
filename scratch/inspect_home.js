const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://sudarshansudarshan.github.io/vinternship/');
    console.log(res.data.substring(0, 10000));
  } catch (err) {
    console.error(err);
  }
}
test();
