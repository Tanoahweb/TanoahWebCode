const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf-8');
const lines = env.split('\n');
const envVars = {};
lines.forEach(l => {
  const clean = l.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      envVars[clean.slice(0, idx).trim()] = clean.slice(idx + 1).trim();
    }
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function run() {
  try {
    const { data: prods, error } = await supabase.from('products').select('*, images:product_images(*), variants:product_variants(*)');
    if (error) {
      console.log('Supabase Error:', error.message);
    } else {
      console.log('Total products in Supabase:', prods.length);
      prods.forEach(p => {
        console.log('Title:', p.title, 'id:', p.id, 'status:', p.status, 'product_type:', p.product_type);
        console.log('Images:', JSON.stringify(p.images));
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
