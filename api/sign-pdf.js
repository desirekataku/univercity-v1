// api/sign-pdf.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  // Récupérer l'URL du PDF
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }
  
  try {
    // Extraire le public_id de l'URL Cloudinary
    // Exemple: https://res.cloudinary.com/dgil48bqm/raw/upload/v123456/univercity/resources/abc.pdf
    const regex = /\/raw\/upload\/v\d+\/(.+)\.pdf$/;
    const matches = url.match(regex);
    
    if (!matches) {
      return res.status(400).json({ error: 'URL Cloudinary invalide' });
    }
    
    const publicId = matches[1];
    
    // Générer la signature (valable 5 minutes)
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + 300;
    
    // Chaîne à signer
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}`;
    
    // Générer la signature avec le secret
    const signature = crypto
      .createHash('sha256')
      .update(stringToSign + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');
    
    // Construire l'URL signée
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const signedUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}.pdf?sign_url=true&timestamp=${timestamp}&signature=${signature}&api_key=${process.env.CLOUDINARY_API_KEY}`;
    
    // Retourner l'URL signée
    return res.status(200).json({ 
      success: true, 
      url: signedUrl,
      expiresAt 
    });
    
  } catch (error) {
    console.error('Erreur signature:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération de la signature' });
  }
}
