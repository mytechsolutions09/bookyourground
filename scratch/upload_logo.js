import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  const filePath = path.join(process.cwd(), 'assets', 'BOOK_MY_GROUND__6_-removebg-preview.png');
  const fileContent = fs.readFileSync(filePath);

  const { data, error } = await supabase.storage
    .from('assets')
    .upload('logo.png', fileContent, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('Error uploading logo:', error);
  } else {
    console.log('Logo uploaded successfully:', data);
  }
}

uploadLogo();
