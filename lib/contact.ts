export const CONTACT = {
  name: 'Onur Büyükcanavar',
  email: 'onurbuyukcanavar@gmail.com',
  linkedin: {
    // Adres Türkçe karakter içerdiği için bağlantıda kodlanmış hâli kullanılır.
    url: `https://www.linkedin.com/in/${encodeURIComponent('onur-büyükcanavar-049706365')}`,
    label: 'linkedin.com/in/onur-büyükcanavar',
  },
} as const;

/** İletişim formu alan sınırları (istemci ve sunucu aynı değerleri kullanır). */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 120 },
  subject: { min: 2, max: 200 },
  body: { min: 10, max: 5000 },
} as const;
