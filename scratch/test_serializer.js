const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const VINTERNSHIP_BASE = "https://sudarshansudarshan.github.io/vinternship";

function parseElement($, node, baseUrl) {
  if (node.type === 'text') {
    return node.data.trim();
  }

  if (node.type !== 'tag') {
    return '';
  }

  const tagName = node.name.toLowerCase();

  // Skip scripts, styles, forms, navigation, footer, header, sidebars
  if (['script', 'style', 'nav', 'footer', 'header', 'noscript', 'iframe', 'form'].includes(tagName)) {
    return '';
  }
  const className = $(node).attr('class') || '';
  if (className.match(/(sidebar|menu|nav|footer|header|ad-|social-)/i)) {
    return '';
  }

  // Handle links
  if (tagName === 'a') {
    const href = $(node).attr('href');
    const text = $(node).text().trim().replace(/\s+/g, ' ');
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
      return text;
    }
    let absoluteUrl = href;
    try {
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        absoluteUrl = new URL(href, baseUrl).toString();
      }
    } catch (e) {}
    return `[${text || href}](${absoluteUrl})`;
  }

  const childTexts = [];
  $(node).contents().each((_, child) => {
    const parsed = parseElement($, child, baseUrl);
    if (parsed) {
      childTexts.push(parsed);
    }
  });

  const innerText = childTexts.join(' ').trim().replace(/\s+/g, ' ');
  if (!innerText) return '';

  if (tagName.match(/^h[1-6]$/)) {
    const level = tagName.charAt(1);
    return `\n${'#'.repeat(parseInt(level))} ${innerText}\n`;
  }

  if (tagName === 'p') {
    return `\n${innerText}\n`;
  }

  if (tagName === 'li') {
    return `* ${innerText}`;
  }

  if (tagName === 'tr') {
    return `| ${childTexts.join(' | ')} |`;
  }

  if (tagName === 'blockquote') {
    return `> ${innerText}`;
  }

  if (tagName === 'pre' || tagName === 'code') {
    return `\`\`\`\n${$(node).text().trim()}\n\`\`\``;
  }

  if (['div', 'span', 'section', 'article', 'body', 'ul', 'ol', 'table', 'tbody'].includes(tagName)) {
    if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
      return `\n${innerText}\n`;
    }
    return innerText;
  }

  return innerText;
}

async function run() {
  try {
    const res = await axios.get('https://sudarshansudarshan.github.io/vinternship/');
    const $ = cheerio.load(res.data);
    const body = $('body')[0];
    const markdown = parseElement($, body, VINTERNSHIP_BASE);
    
    // Clean up empty lines
    const cleaned = markdown
      .split('\n')
      .map(line => line.trim())
      .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
      .join('\n');

    console.log(cleaned.substring(0, 3000));
  } catch (err) {
    console.error(err);
  }
}
run();
