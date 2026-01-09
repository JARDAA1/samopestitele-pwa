// ============================================
// IMAGE UPLOAD UTILITY - SUPABASE STORAGE
// ============================================

import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Nahraje obrázek do Supabase Storage
 * @param uri - Local URI obrázku (z ImagePicker)
 * @param folder - Složka v bucketu (např. 'logos')
 * @returns Public URL obrázku nebo null
 */
export async function uploadImage(
  uri: string,
  folder: string = 'logos'
): Promise<{ url: string; path: string } | null> {
  try {
    console.log('📤 Nahrávám obrázek:', uri);

    // 1. Získat binary data (pro web použít fetch, pro native FileSystem)
    let blob: Blob;
    let contentType = 'image/jpeg';

    if (uri.startsWith('blob:') || uri.startsWith('http')) {
      // Web: použít fetch
      console.log('🌐 Web mode: using fetch');
      const response = await fetch(uri);
      blob = await response.blob();
      contentType = blob.type || 'image/jpeg';
      console.log('📋 Blob type:', blob.type);
      console.log('📦 Blob size:', blob.size, 'bytes', `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      // React Native: použít FileSystem
      console.log('📱 Native mode: using FileSystem');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      console.log('📊 Base64 délka:', base64.length, 'znaků');

      // Detekce MIME typu z URI
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      if (fileExt === 'png') contentType = 'image/png';
      else if (fileExt === 'webp') contentType = 'image/webp';
      else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';

      // Převést base64 na blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: contentType });
    }

    // 2. Určit příponu z content type
    let fileExt = 'jpg';
    if (contentType === 'image/png') fileExt = 'png';
    else if (contentType === 'image/webp') fileExt = 'webp';

    // 3. Vytvořit unikátní název souboru
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    console.log('📝 Název souboru:', fileName);
    console.log('📋 Content-Type:', contentType);

    // 4. Upload do Supabase Storage
    const { data, error } = await supabase.storage
      .from('pestitele-fotky')
      .upload(fileName, blob, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      console.error('   Status:', error.statusCode);
      console.error('   Message:', error.message);
      throw error;
    }

    console.log('✅ Upload úspěšný:', data.path);

    // 5. Získat veřejnou URL
    const { data: urlData } = supabase.storage
      .from('pestitele-fotky')
      .getPublicUrl(data.path);

    console.log('🔗 Public URL:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };

  } catch (error: any) {
    console.error('❌ Chyba při uploadu:', error);
    console.error('   Error detail:', JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Smaže obrázek z Storage
 * @param path - Cesta k souboru v Storage
 */
export async function deleteImage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('pestitele-fotky')
      .remove([path]);

    if (error) throw error;

    console.log('🗑️ Obrázek smazán:', path);
    return true;
  } catch (error) {
    console.error('❌ Chyba při mazání:', error);
    return false;
  }
}

/**
 * Validace obrázku
 * @param uri - Local URI obrázku
 * @param maxSizeMB - Maximální velikost v MB
 */
export async function validateImage(
  uri: string,
  maxSizeMB: number = 5
): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log('🔍 Validating image URI:', uri);

    // Kontrola velikosti souboru
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📊 File info:', fileInfo);

      if (fileInfo.exists && 'size' in fileInfo) {
        const fileSizeMB = fileInfo.size / (1024 * 1024);
        console.log('📏 File size:', fileSizeMB.toFixed(2), 'MB');

        if (fileSizeMB > maxSizeMB) {
          return {
            valid: false,
            error: `Obrázek je příliš velký (${fileSizeMB.toFixed(1)} MB). Maximální velikost je ${maxSizeMB} MB.`
          };
        }
      }
    } catch (sizeError) {
      console.warn('⚠️ Nelze zjistit velikost souboru:', sizeError);
      // Pokračujeme bez kontroly velikosti - Supabase má vlastní limity
    }

    // ImagePicker už vrací jen obrázky, takže formát nemusíme kontrolovat
    console.log('✅ Validation passed');
    return { valid: true };

  } catch (error: any) {
    console.error('❌ Validation error:', error);
    return { valid: false, error: error.message };
  }
}

// ============================================
// PŘÍKLAD POUŽITÍ
// ============================================

/*
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, validateImage } from './imageUpload';

// Výběr obrázku
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
});

if (!result.canceled) {
  const uri = result.assets[0].uri;
  
  // Validace
  const validation = await validateImage(uri, 5);
  if (!validation.valid) {
    Alert.alert('Chyba', validation.error);
    return;
  }
  
  // Upload
  const uploaded = await uploadImage(uri, 'logos');
  if (uploaded) {
    console.log('URL:', uploaded.url);
    console.log('Path:', uploaded.path);
    
    // Ulož do databáze
    await supabase
      .from('pestitele')
      .update({ 
        foto_url: uploaded.url,
        foto_path: uploaded.path 
      })
      .eq('id', pestiteleId);
  }
}
*/
