// api/sign-pdf.js
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }
  
  try {
    // 🔥 CORRECTION : Inclure le numéro de version dans le public_id
    // L'URL est de type: .../raw/upload/v123456/path/to/file.pdf
    const regex = /\/raw\/upload\/(v\d+\/.*)\.pdf$/;
    const matches = url.match(regex);
    
    if (!matches) {
      return res.status(400).json({ error: 'URL Cloudinary invalide' });
    }
    
    // publicId contient maintenant "v1778688072/univercity/resources/gmtmdm1haca8bib9nkta"
    const publicId = matches[1];
    
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha256')
      .update(stringToSign + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');
    
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    
    // 🔥 CORRECTION : Utiliser publicId complet dans l'URL
    const signedUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}.pdf?sign_url=true&timestamp=${timestamp}&signature=${signature}&api_key=${apiKey}`;
    
    return res.status(200).json({ 
      success: true, 
      url: signedUrl,
      expiresAt: timestamp + 300
    });
    
  } catch (error) {
    console.error('Erreur signature:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération de la signature' });
  }
}
