// automation/helpers/cloudinary.js
// Helpers para gerenciar fotos no Cloudinary

const cloudinary = require('../../backend/src/config/cloudinary');

/**
 * Deletar uma foto do Cloudinary
 */
async function deletePhoto(photoUrl) {
  try {
    const matches = photoUrl.match(/\/guia-aventureiro\/([^/.]+)/);
    if (matches && matches[1]) {
      const publicId = `guia-aventureiro/${matches[1]}`;
      await cloudinary.uploader.destroy(publicId);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erro ao deletar foto: ${error.message}`);
    return false;
  }
}

/**
 * Deletar múltiplas fotos do Cloudinary
 */
async function deletePhotos(photos) {
  if (!photos || photos.length === 0) return 0;
  
  let deleted = 0;
  for (const photoUrl of photos) {
    if (await deletePhoto(photoUrl)) {
      deleted++;
    }
  }
  return deleted;
}

/**
 * Deletar todas as fotos de um roteiro
 */
async function deleteItineraryPhotos(itinerary) {
  const photos = itinerary.rating?.photos || [];
  if (photos.length === 0) return 0;
  
  console.log(`   📸 Deletando ${photos.length} foto(s) do Cloudinary...`);
  const deleted = await deletePhotos(photos);
  console.log(`   ✅ ${deleted}/${photos.length} foto(s) deletadas`);
  
  return deleted;
}

module.exports = {
  deletePhoto,
  deletePhotos,
  deleteItineraryPhotos,
};
