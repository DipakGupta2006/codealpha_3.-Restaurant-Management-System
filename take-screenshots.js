const puppeteer = require('puppeteer-core');
const path = require('node:path');
const fs = require('node:fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = __dirname;
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureLinkedInScreenshots() {
  console.log('🚀 Launching Chrome to capture Ultra-HD LinkedIn Screenshots...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // 1920x1080 with 2x scale factor for crystal clear, sharp text on LinkedIn!
  await page.setViewport({ width: 1600, height: 960, deviceScaleFactor: 1.5 });

  const pagesToCapture = [
    {
      name: '01_Admin_Dashboard.png',
      url: 'http://localhost:3001/admin',
      desc: 'Admin Analytics, KPIs & Stock Alerts'
    },
    {
      name: '02_Kitchen_POS_Orders.png',
      url: 'http://localhost:3001/admin/orders',
      desc: 'Kitchen POS & Live Order Lifecycle'
    },
    {
      name: '03_Table_Floor_Plan.png',
      url: 'http://localhost:3001/admin/tables',
      desc: 'Dining Room Table Occupancy & Seating'
    },
    {
      name: '04_Customer_Home_Page.png',
      url: 'http://localhost:3001/',
      desc: 'Bistro Customer Landing Page'
    },
    {
      name: '05_Food_Menu_Catalog.png',
      url: 'http://localhost:3001/menu',
      desc: 'Interactive Menu with Search & Filters'
    },
    {
      name: '06_Table_Reservation.png',
      url: 'http://localhost:3001/reserve',
      desc: 'Smart Collision-Free Table Booking'
    },
    {
      name: '07_Online_Order_Checkout.png',
      url: 'http://localhost:3001/order',
      desc: 'Dine-In & Takeaway Checkout'
    },
    {
      name: '08_Live_Order_Tracker.png',
      url: 'http://localhost:3001/track?orderNumber=ORD-1002',
      desc: 'Real-Time Customer Order Stepper'
    }
  ];

  for (const item of pagesToCapture) {
    try {
      console.log(`📸 Capturing ${item.name} (${item.desc})...`);
      await page.goto(item.url, { waitUntil: 'networkidle0', timeout: 12000 });
      await new Promise(r => setTimeout(r, 600)); // allow animations to settle

      // Save into both 'screenshots/' folder and the root project folder
      const screenshotsPath = path.join(SCREENSHOTS_DIR, item.name);
      const rootPath = path.join(ROOT_DIR, item.name);

      await page.screenshot({ path: screenshotsPath, fullPage: false });
      fs.copyFileSync(screenshotsPath, rootPath);

      console.log(`  ✅ Saved in root & screenshots/: ${item.name}`);
    } catch (e) {
      console.error(`  ❌ Failed capturing ${item.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('\n🎉 ALL LINKEDIN SCREENSHOTS GENERATED & SAVED IN ROOT DIRECTORY!\n');
}

captureLinkedInScreenshots().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
