/**
 * Dönüştürücü araçlarının tanımları (sayfa adresleri, başlıklar, kabul edilen dosyalar).
 * Hem sunucu tarafındaki sayfa üst verisinde hem de istemcideki dönüştürücüde kullanılır.
 */

export type ToolId = 'udf-pdf' | 'udf-word' | 'word-pdf' | 'word-udf' | 'pdf-word' | 'pdf-udf' | 'gorsel-pdf' | 'pdf-birlestir';

export type Tool = {
  id: ToolId;
  title: string;
  short: string;
  description: string;
  /** Kabul edilen uzantılar */
  accept: string[];
  /** Dosya seçicinin accept değeri (mobilde .udf gibi özel türler gri görünmesin diye boş bırakılabilir) */
  inputAccept?: string;
  output: 'pdf' | 'docx' | 'udf';
  /** Birden çok girdiden tek çıktı mı üretir? */
  combine?: boolean;
  /** Dönüştürme kalitesiyle ilgili kullanıcıya gösterilecek not */
  caveat?: string;
};

export const TOOLS: Tool[] = [
  {
    id: 'udf-pdf', title: 'UDF → PDF', short: 'UYAP belgesini PDF\'e çevir',
    description: 'UYAP Doküman Editörü ile hazırlanmış .udf dosyalarını, sayfa düzeni, sekmeleri, tabloları ve sayfa numaralarıyla PDF\'e dönüştürür.',
    accept: ['.udf'], output: 'pdf',
  },
  {
    id: 'udf-word', title: 'UDF → Word', short: 'UYAP belgesini Word\'de düzenle',
    description: '.udf dosyalarını Microsoft Word\'de açılıp düzenlenebilen .docx belgesine dönüştürür.',
    accept: ['.udf'], output: 'docx',
  },
  {
    id: 'word-pdf', title: 'Word → PDF', short: 'Word belgesini PDF\'e çevir',
    description: '.docx belgelerini başlık, alt bilgi, tablo, görsel ve sayfa numaralarıyla PDF\'e dönüştürür.',
    accept: ['.docx'], inputAccept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', output: 'pdf',
    caveat: 'Eski .doc biçimi desteklenmez; Word\'de "Farklı Kaydet → .docx" ile kaydedebilirsiniz.',
  },
  {
    id: 'word-udf', title: 'Word → UDF', short: 'Dilekçeyi UYAP biçimine çevir',
    description: 'Word\'de hazırladığınız .docx dilekçeyi UYAP\'a yüklenebilecek .udf biçimine dönüştürür.',
    accept: ['.docx'], inputAccept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', output: 'udf',
    caveat: 'UYAP\'a yüklemeden önce dosyayı UYAP Doküman Editörü\'nde açıp kontrol etmenizi öneririz. E-imza, belge UYAP\'ta imzalanırken eklenir.',
  },
  {
    id: 'pdf-word', title: 'PDF → Word', short: 'PDF\'i düzenlenebilir Word\'e çevir',
    description: 'Metin içeren PDF dosyalarını paragraf, hizalama ve sekme düzeni korunarak düzenlenebilir .docx belgesine dönüştürür.',
    accept: ['.pdf'], inputAccept: '.pdf,application/pdf', output: 'docx',
    caveat: 'Paragraf ve biçim yapısı PDF\'ten tahmin edilir; taranmış (görüntü) PDF\'ler metne çevrilemez, görseller aktarılmaz.',
  },
  {
    id: 'pdf-udf', title: 'PDF → UDF', short: 'PDF\'i UYAP biçimine çevir',
    description: 'Metin içeren PDF dosyalarını UYAP Doküman Editörü\'nde açılabilen .udf belgesine dönüştürür.',
    accept: ['.pdf'], inputAccept: '.pdf,application/pdf', output: 'udf',
    caveat: 'Paragraf ve biçim yapısı PDF\'ten tahmin edilir; taranmış PDF\'ler metne çevrilemez. Yüklemeden önce UYAP Doküman Editörü\'nde kontrol edin.',
  },
  {
    id: 'gorsel-pdf', title: 'Görsel → PDF', short: 'Fotoğraf ve taramaları PDF yap',
    description: 'JPG, PNG ve telefon fotoğraflarını, seçtiğiniz sırayla her biri bir sayfa olacak şekilde tek PDF\'te birleştirir.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'], inputAccept: 'image/*', output: 'pdf', combine: true,
  },
  {
    id: 'pdf-birlestir', title: 'PDF Birleştir', short: 'Birden çok PDF\'i tek dosya yap',
    description: 'Dilekçe, ek ve delilleri seçtiğiniz sırayla tek bir PDF dosyasında birleştirir.',
    accept: ['.pdf'], inputAccept: '.pdf,application/pdf', output: 'pdf', combine: true,
  },
];

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const OUTPUT_LABEL = { pdf: 'PDF', docx: 'Word (.docx)', udf: 'UDF' } as const;
export const OUTPUT_MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  udf: 'application/octet-stream',
} as const;

/** Tek dosya için en fazla boyut (bayt). Dönüştürme tarayıcıda yapıldığından makul bir üst sınır konur. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
