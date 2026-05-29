const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function run() {
  try {
    const res = await axios.get('https://sudarshansudarshan.github.io/vinternship/');
    const $ = cheerio.load(res.data);
    
    // Dump text from cohort cards to see exactly how they look
    const cohorts = [];
    $('.cohort-card, [class*="cohort"], .card, div').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.includes('AKSians') || text.includes('RSAians') || text.includes('Kruskalians')) {
        cohorts.push({
          tagName: el.tagName,
          className: $(el).attr('class') || '',
          text: text.substring(0, 200)
        });
      }
    });

    const output = JSON.stringify(cohorts, null, 2);
    fs.writeFileSync('scratch/home_cohorts.json', output, 'utf-8');
    console.log('Saved to scratch/home_cohorts.json');
  } catch (err) {
    console.error(err);
  }
}
run();
