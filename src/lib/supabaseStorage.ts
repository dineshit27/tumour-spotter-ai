import { supabase } from "@/integrations/supabase/client";

export interface ScanResult {
  tumorDetected: boolean;
  confidence: number;
  tumorLevel: "None" | "Small" | "Medium" | "Large";
  tumorType?: string;
  recommendations: string[];
  processingTime: number;
  allPredictions?: Array<{ class: string; confidence: number }>;
}

/**
 * Upload MRI scan image to Supabase Storage
 * Files are stored in user-specific folders: userId/filename
 */
export async function uploadScanToStorage(
  file: File,
  userId: string
): Promise<{ imageUrl: string; error?: string }> {
  try {
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mri-scans')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { imageUrl: '', error: uploadError.message };
    }

    // Get public URL (note: bucket is private, URL requires auth)
    const { data: urlData } = supabase.storage
      .from('mri-scans')
      .getPublicUrl(filePath);

    return { imageUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Storage upload error:', error);
    return { 
      imageUrl: '', 
      error: error instanceof Error ? error.message : 'Failed to upload image' 
    };
  }
}

/**
 * Save scan analysis results to database
 */
export async function saveScanHistory(
  userId: string,
  imageUrl: string,
  fileName: string,
  fileSize: number,
  result: ScanResult
) {
  try {
    const { data, error } = await supabase
      .from('scan_history')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        file_name: fileName,
        file_size: fileSize,
        tumor_detected: result.tumorDetected,
        confidence: result.confidence,
        tumor_level: result.tumorLevel,
        tumor_type: result.tumorType || null,
        recommendations: result.recommendations,
        processing_time: result.processingTime,
        all_predictions: result.allPredictions || null
      })
      .select()
      .single();

    if (error) {
      console.error('Database save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Save scan history error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save scan' 
    };
  }
}

/**
 * Get user's scan history
 */
export async function getUserScanHistory(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch history error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get scan history error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to fetch history' 
    };
  }
}

/**
 * Delete a scan and its image from storage
 */
export async function deleteScan(scanId: string, imageUrl: string, userId: string) {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/mri-scans/');
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid image URL' };
    }
    const filePath = urlParts[1];

    // Delete from database
    const { error: dbError } = await supabase
      .from('scan_history')
      .delete()
      .eq('id', scanId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return { success: false, error: dbError.message };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('mri-scans')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Don't fail if storage delete fails (DB already deleted)
    }

    return { success: true };
  } catch (error) {
    console.error('Delete scan error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete scan' 
    };
  }
}

/**
 * Get signed URL for private image access
 */
export async function getSignedImageUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('mri-scans')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    return null;
  }
}
