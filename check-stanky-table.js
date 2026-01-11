const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTable() {
  console.log('🔍 Checking stanky table structure...\n');

  // Try to fetch one stanek to see the columns
  const { data, error } = await supabase
    .from('stanky')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error fetching from stanky table:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Found stanky table with columns:');
    console.log(Object.keys(data[0]));
    console.log('\n📋 Sample data:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️  Table exists but has no data yet');
  }

  // Check if storage bucket exists
  console.log('\n🗂️  Checking storage buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error fetching buckets:', bucketsError);
  } else {
    console.log('📦 Available buckets:');
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });

    const stankyPhotoBucket = buckets.find(b => b.name === 'stanky-photos');
    if (stankyPhotoBucket) {
      console.log('\n✅ stanky-photos bucket exists!');
    } else {
      console.log('\n❌ stanky-photos bucket NOT FOUND - need to create it!');
    }
  }
}

checkTable();
